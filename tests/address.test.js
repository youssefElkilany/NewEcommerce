import assert from 'node:assert/strict'
import test from 'node:test'
import addressModel from '../DB/Models/address.model.js'
import * as addressController from '../Src/Modules/Address/Controller/address.js'
import addressRouter from '../Src/Modules/Address/address.route.js'
import {
    validateAddressId,
    validateCreateAddress,
    validateUpdateAddress
} from '../Src/Modules/Address/validation.js'

const userId = '507f1f77bcf86cd799439011'
const otherUserId = '507f1f77bcf86cd799439012'
const addressId = '507f1f77bcf86cd799439013'

const validBody = () => ({
    label:'home',
    name:'Youssef',
    phone:'01000000000',
    country:'Egypt',
    city:'Cairo',
    street:'Test street'
})

const runMiddleware = (middleware, req) => {
    const response = {}
    const res = {
        status(code) { response.status = code; return this },
        json(body) { response.body = body; return this }
    }
    middleware(req,res,() => { response.next = true })
    return response
}

const invoke = async (controller,req) => {
    const response = {}
    const res = {
        status(code) { response.status = code; return this },
        json(body) { response.body = body; return this }
    }
    await controller(req,res,error => { response.error = error })
    return response
}

test('create validation accepts the schema and rejects unsafe or invalid input', () => {
    const req = {body:{
        ...validBody(),
        location:{coordinates:[31.2357,30.0444]}
    }}
    const valid = runMiddleware(validateCreateAddress,req)
    assert.equal(valid.next,true)
    assert.equal(req.body.location.type,'Point')

    for (const body of [
        {...validBody(),name:undefined},
        {...validBody(),label:'school'},
        {...validBody(),deliveryInstructions:'x'.repeat(301)},
        {...validBody(),location:{coordinates:[181,30]}},
        {...validBody(),location:{coordinates:[31,91]}},
        {...validBody(),userId:otherUserId}
    ]) {
        assert.equal(runMiddleware(validateCreateAddress,{body}).status,400)
    }
})

test('update and address ID validation reject empty or invalid input', () => {
    assert.equal(runMiddleware(validateUpdateAddress,{body:{}}).status,400)
    assert.equal(runMiddleware(validateUpdateAddress,{body:{city:'Giza'}}).next,true)
    assert.equal(runMiddleware(validateAddressId,{params:{addressId:'invalid'}}).status,400)
    assert.equal(runMiddleware(validateAddressId,{params:{addressId}}).next,true)
})

test('create assigns the authenticated owner and makes the first address default', async () => {
    const originals = [addressModel.exists,addressModel.updateMany,addressModel.create]
    let resetFilter
    let created
    addressModel.exists = async () => null
    addressModel.updateMany = async filter => { resetFilter = filter }
    addressModel.create = async data => { created = data; return data }
    try {
        const response = await invoke(addressController.createAddress,{
            body:validBody(),user:{id:userId}
        })
        assert.equal(response.status,201)
        assert.equal(created.userId,userId)
        assert.equal(created.isDefault,true)
        assert.deepEqual(resetFilter,{userId})
    } finally {
        [addressModel.exists,addressModel.updateMany,addressModel.create] = originals
    }
})

test('list and get queries are always scoped to the authenticated owner', async () => {
    const originals = [addressModel.find,addressModel.findOne]
    let listFilter
    let getFilter
    addressModel.find = filter => {
        listFilter = filter
        return {sort:async () => []}
    }
    addressModel.findOne = async filter => {
        getFilter = filter
        return {_id:addressId}
    }
    try {
        assert.equal((await invoke(addressController.getAddresses,{user:{id:userId}})).status,200)
        assert.deepEqual(listFilter,{userId})
        assert.equal((await invoke(addressController.getAddress,{
            params:{addressId},user:{id:userId}
        })).status,200)
        assert.deepEqual(getFilter,{_id:addressId,userId})
    } finally {
        [addressModel.find,addressModel.findOne] = originals
    }
})

test('setting an address as default unsets only the same user other addresses', async () => {
    const originals = [addressModel.findOne,addressModel.updateMany,addressModel.findOneAndUpdate]
    let resetFilter
    let updateFilter
    addressModel.findOne = async () => ({_id:addressId,isDefault:false})
    addressModel.updateMany = async filter => { resetFilter = filter }
    addressModel.findOneAndUpdate = async filter => {
        updateFilter = filter
        return {_id:addressId,isDefault:true}
    }
    try {
        const response = await invoke(addressController.updateAddress,{
            params:{addressId},body:{isDefault:true},user:{id:userId}
        })
        assert.equal(response.status,200)
        assert.deepEqual(resetFilter,{userId,_id:{$ne:addressId}})
        assert.deepEqual(updateFilter,{_id:addressId,userId})
    } finally {
        [addressModel.findOne,addressModel.updateMany,addressModel.findOneAndUpdate] = originals
    }
})

test('update returns 404 when the address is not owned by the user', async () => {
    const original = addressModel.findOne
    addressModel.findOne = async () => null
    try {
        const response = await invoke(addressController.updateAddress,{
            params:{addressId},body:{city:'Giza'},user:{id:userId}
        })
        assert.equal(response.error.cause,404)
    } finally {
        addressModel.findOne = original
    }
})

test('deleting a default address promotes another address for the same user', async () => {
    const originals = [addressModel.findOneAndDelete,addressModel.findOneAndUpdate]
    let deleteFilter
    let replacementFilter
    addressModel.findOneAndDelete = async filter => {
        deleteFilter = filter
        return {_id:addressId,isDefault:true}
    }
    addressModel.findOneAndUpdate = async filter => {
        replacementFilter = filter
        return {_id:otherUserId}
    }
    try {
        const response = await invoke(addressController.deleteAddress,{
            params:{addressId},user:{id:userId}
        })
        assert.equal(response.status,200)
        assert.deepEqual(deleteFilter,{_id:addressId,userId})
        assert.deepEqual(replacementFilter,{userId})
    } finally {
        [addressModel.findOneAndDelete,addressModel.findOneAndUpdate] = originals
    }
})

test('address routes expose authenticated CRUD handlers', () => {
    const root = addressRouter.stack.find(layer => layer.route?.path === '/')
    const single = addressRouter.stack.find(layer => layer.route?.path === '/:addressId')
    const auth = addressRouter.stack.find(layer => !layer.route)

    assert.ok(auth)
    assert.ok(root?.route.methods.post)
    assert.ok(root?.route.methods.get)
    assert.ok(single?.route.methods.get)
    assert.ok(single?.route.methods.patch)
    assert.ok(single?.route.methods.delete)

    assert.ok(root.route.stack.some(layer => layer.handle === validateCreateAddress))
    assert.ok(single.route.stack.some(layer => layer.handle === validateAddressId))
    assert.ok(single.route.stack.some(layer => layer.handle === validateUpdateAddress))
})
