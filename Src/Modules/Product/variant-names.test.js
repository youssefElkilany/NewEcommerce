import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Product from '../../../DB/Models/product.model.js'
import Brand from '../../../DB/Models/brand.model.js'
import SubCategory from '../../../DB/Models/subCategory.model.js'
import Order from '../../../DB/Models/order.model.js'
import Address from '../../../DB/Models/address.model.js'
import Attempt from '../../../DB/Models/checkoutAttempt.model.js'
import cloudinary from '../../../Src/Utills/Cloudinary.js'
import * as controller from '../../../Src/Modules/Product/Controller/product.js'
import * as schema from '../../../Src/Modules/Product/validation.js'
import {createOrder} from '../../../Src/Modules/Order/Controller/order.js'
import {checkout} from '../../../Src/Modules/Order/Controller/checkout.js'
import Features from '../../../Src/Utills/AggregationApiFeatures.js'
import {migrateProductNames} from '../../../scripts/migrate-variant-names.js'

const productId = '507f1f77bcf86cd799439011'
const variantId = '507f1f77bcf86cd799439012'
const user = {id:productId, _id:productId}
const next = error => {throw error}
const response = {json:value => value, status() {return this}}

test('model stores required names only on variants', () => {
    const product = new Product({name:'Outer', description:'Cotton', slug:'shirt',
        categoryId:productId, subCategoryId:productId, brandId:productId, brandName:'Brand', createdBy:productId,
        variants:[{name:' Shirt Medium ', sku:'SKU-M', price:100, finalPrice:100, mainImage:{public_id:'image',secure_url:'url'}}]})
    assert.equal(product.validateSync(), undefined)
    assert.equal(product.toObject().name, undefined)
    assert.equal(product.variants[0].name, 'Shirt Medium')
    product.variants[0].name = ' '
    assert.ok(product.validateSync().errors['variants.0.name'])
})

test('adding variants requires a name even when images are reused', () => {
    const body = {productId, price:100, mainImagePublicId:'image'}
    assert.ok(schema.addVariants.validate(body).error)
    assert.ok(schema.addVariants.validate({...body, name:' '}).error)
    assert.equal(schema.addVariants.validate({...body, name:'Medium'}).error, undefined)
    assert.equal(schema.getProducts.validate({fields:'variants.name', sort:'name'}).error, undefined)
    assert.ok(schema.getProducts.validate({fields:'name'}).error)
})

test('product creation saves its name inside the first variant', async t => {
    t.mock.method(SubCategory, 'findOne', async () => ({}))
    t.mock.method(Brand, 'findById', async () => ({name:'Brand'}))
    t.mock.method(cloudinary.uploader, 'upload', async () => ({public_id:'image', secure_url:'url'}))
    let saved
    t.mock.method(Product, 'create', async data => {saved = data; return data})
    await controller.addProduct({user, body:{name:' Shirt Medium ', price:100, description:'Cotton',
        categoryId:productId, subCategoryId:productId, brandId:productId}, files:{mainImage:[{path:'image'}]}}, response, next)
    assert.equal(saved.name, undefined)
    assert.equal(saved.variants.name, 'Shirt Medium')
    assert.ok(saved.slug)
})

test('image reuse gives the new variant its own name', async t => {
    const image = {public_id:'image', secure_url:'url'}
    t.mock.method(Product, 'findOne', async () => ({variants:[{_id:variantId, name:'Small', mainImage:image, subImages:[]}]}))
    t.mock.method(cloudinary.uploader, 'upload', async () => assert.fail('Unexpected upload'))
    let saved
    t.mock.method(Product, 'findOneAndUpdate', async (query, update) => {saved = update.$push.variants; return {variants:[saved]}})
    await controller.addVariants({user, params:{productId}, body:{name:' Medium ', price:100, mainImagePublicId:'image'}}, response, next)
    assert.equal(saved.name, 'Medium')
    assert.deepEqual(saved.mainImage, image)
})

test('renaming a variant needs no files and only changes the targeted name', async t => {
    t.mock.method(Product, 'findOne', async () => ({variants:[{_id:variantId, name:'Small'}]}))
    let saved
    t.mock.method(Product, 'findOneAndUpdate', async (query, update) => {
        assert.equal(query['variants._id'], variantId)
        assert.equal(query.createdBy, user.id)
        saved = update
        return {}
    })
    await controller.updateVariant({user, params:{productId, variantId}, body:{name:' Medium '}}, response, next)
    assert.deepEqual(saved, {$set:{'variants.$.name':'Medium'}})
})

test('single-variant endpoint returns the variant name', async t => {
    t.mock.method(Product, 'findOne', () => ({select:() => ({lean:async () => ({_id:productId, variants:[{_id:variantId, name:'Medium'}]})})}))
    const result = await controller.getProductVariant({params:{productId, variantId}}, response, next)
    assert.equal(result.variant.name, 'Medium')
    assert.equal(result.name, undefined)
    assert.deepEqual(result.availableSizes, [])
})

test('size selector matches every other option and returns the requested variant, not the first', async t => {
    const make = (id, options, extra = {}) => ({_id:id, options, stock:3, isActive:true, ...extra})
    const variants = [
        make('white', {color:'White', size:'Small', material:'Cotton'}),
        make(variantId, {color:'Black', size:'Small', material:'Cotton'}),
        make('medium', {color:'Black', size:'Medium', material:'Cotton'}),
        make('sold-out', {color:'Black', size:'Large', material:'Cotton'}, {stock:0}),
        make('inactive', {color:'Black', size:'XL', material:'Cotton'}, {isActive:false}),
        make('different-material', {color:'Black', size:'Medium', material:'Wool'}),
        make('missing-option', {color:'Black', size:'Medium'}),
        make('extra-option', {color:'Black', size:'Medium', material:'Cotton', fit:'Slim'}),
        make('no-size', {color:'Black', material:'Cotton'}),
        make('empty-size', {color:'Black', material:'Cotton', size:' '})
    ]
    t.mock.method(Product, 'findOne', query => {
        assert.equal(query._id, productId)
        assert.equal(query.isDeleted, false)
        return {select:selection => {
            assert.ok(selection.split(' ').includes('variants'))
            return {lean:async () => ({_id:productId, variants})}
        }}
    })
    const result = await controller.getProductVariant({params:{productId, variantId}}, response, next)
    assert.deepEqual(result.variant, variants[1])
    assert.deepEqual(result.availableSizes, [
        {size:'Small', variantId}, {size:'Medium', variantId:'medium'}
    ])
})

test('size-only products include available siblings even when the selected size is sold out', async t => {
    t.mock.method(Product, 'findOne', () => ({select:() => ({lean:async () => ({_id:productId, variants:[
        {_id:variantId, options:{size:'Small'}, stock:0, isActive:true},
        {_id:'medium', options:{size:'Medium'}, stock:2},
        {_id:'large', options:{size:'Large'}, stock:2, isActive:null}
    ]})})}))
    const result = await controller.getProductVariant({params:{productId, variantId}}, response, next)
    assert.equal(result.variant._id, variantId)
    assert.deepEqual(result.availableSizes, [{size:'Medium', variantId:'medium'}])
})

test('missing products and missing variants return 404', async t => {
    let product = null
    t.mock.method(Product, 'findOne', () => ({select:() => ({lean:async () => product})}))
    for (const value of [null, {_id:productId, variants:[]}]) {
        product = value
        let error
        await controller.getProductVariant({params:{productId, variantId}}, response, value => {error = value})
        assert.equal(error.cause, 404)
    }
})

test('search restricts the selected variant and name sorting/projection use its name', () => {
    const features = new Features({search:'Medium', sort:'name', fields:'variants.name'}, Product.aggregate()).filter().search().sort().select()
    assert.equal(features.pipeline[0].$match.$or[0]['variants.name'].$regex, 'Medium')
    const conditions = features.pipeline[1].$set.variants.$filter.cond.$and
    assert.deepEqual(conditions.at(-1).$or[0], {$regexMatch:{input:{$ifNull:['$$variant.name', '']}, regex:'Medium', options:'i'}})
    assert.equal(features.pipeline.find(stage => stage.$sort).$sort['variants.name'], 1)
    assert.deepEqual(features.pipeline.at(-1), {$project:{'variants.name':1}})
})

test('legacy order creation snapshots the selected variant name', async t => {
    t.mock.method(Product, 'findOne', () => ({select:() => ({name:'Wrong outer name', variants:[{name:'Medium', stock:10, price:100, finalPrice:100}]})}))
    const stop = new Error('Captured order')
    let saved, error
    t.mock.method(Order, 'create', async data => {saved = data; throw stop})
    await createOrder({user, body:{phone:['01000000000'], products:[{productId, variantId, quantity:1}]}}, response, value => {error = value})
    assert.match(error.message, /Captured order/)
    assert.equal(saved.products[0].name, 'Medium')
})

test('transactional checkout snapshots the selected variant name', async t => {
    t.mock.method(Attempt, 'init', async () => {})
    t.mock.method(Attempt, 'findOne', async () => null)
    t.mock.method(mongoose.connection, 'transaction', async fn => fn({}))
    t.mock.method(Address, 'findOne', () => ({session:async () => ({name:'Customer'})}))
    t.mock.method(Product, 'findOne', () => ({session:async () => ({_id:productId, name:'Wrong outer name',
        variants:{id:() => ({_id:variantId, name:'Medium', stock:10, price:100, finalPrice:100})}})}))
    t.mock.method(Product, 'updateOne', async () => ({modifiedCount:1}))
    let saved, error
    t.mock.method(Order, 'create', async data => {saved = data[0]; throw new Error('Captured order')})
    await checkout({user, get:() => 'variant-name-test', body:{addressId:productId, phone:['01000000000'],
        products:[{productId, variantId, quantity:1}]}}, response, value => {error = value})
    assert.match(error.message, /Captured order/)
    assert.equal(saved.products[0].name, 'Medium')
})

test('migration preserves named variants, fills missing names, removes outer name and is idempotent', () => {
    const old = {_id:productId, name:' Shirt ', slug:'shirt', variants:[{_id:variantId, stock:2}, {name:'Medium', stock:1}]}
    const migrated = migrateProductNames(old)
    assert.equal(migrated.name, undefined)
    assert.equal(migrated.variants[0].name, 'Shirt')
    assert.equal(migrated.variants[1].name, 'Medium')
    assert.equal(migrated.variants[0].stock, 2)
    assert.equal(migrated.slug, 'shirt')
    assert.equal(old.name, ' Shirt ')
    assert.deepEqual(migrateProductNames(migrated), migrated)
    assert.throws(() => migrateProductNames({_id:productId, variants:[{_id:variantId}]}), /no name/)
})
