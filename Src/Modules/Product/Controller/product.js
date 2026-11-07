import { resolveVariantImages, releaseUnreferencedImages } from '../variant-images.js'
import subCategoryModel from '../../../../DB/Models/subCategory.model.js'
import brandModel from '../../../../DB/Models/brand.model.js'
import { asyncHandler } from '../../../Utills/errorHandler.js'
import productModel from '../../../../DB/Models/product.model.js'
import cloudinary from '../../../Utills/Cloudinary.js'
import { nanoid , customAlphabet } from 'nanoid'
import slugify from 'slugify'
import AggregationApiFeatures from '../../../Utills/AggregationApiFeatures.js'
import { isDeepStrictEqual } from 'node:util'

const generateSku = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  10
);  

export const getrelatedBrands = asyncHandler(async(req,res,next)=>{

    const {subCategoryId} = req.params

    const brands = await productModel.distinct('brandName', {subCategoryId:subCategoryId})
    return res.status(200).json({
        message:"related brands retrieved successfully",
        brands
    })
})

// Search/browse selects the highest-discount available variant per product.
// Filters return a separate product entry for each matching available variant.
export const getProducts = asyncHandler(async(req,res,next)=>{

    let apiFeatures
    try {
        apiFeatures = new AggregationApiFeatures(req.query, productModel.aggregate())
            .filter().search().sort().paginate().select()
            
    } catch (error) {
        return next(error)
    }
    const wantsCount = req.query.count === 'true' || req.query.count === true
    if (wantsCount && (apiFeatures.hasFilter || Object.keys(apiFeatures.searchMatch).length)) {
        const [result] = await productModel.aggregate(apiFeatures.catalogPipeline)
        const totalItems = result?.totals?.[0]?.totalItems || 0
        const page = Number(req.query.page) || 1
        const size = Math.min(Number(req.query.size) || 3, 100)
        return res.status(200).json({ products: result?.products || [],
            pagination: { page, size, totalItems, hasMore: page * size < totalItems } })
    }
    const products = await apiFeatures.mongooseQuery
    return res.status(200).json({ products })
})


export const getProductVariant = asyncHandler(async(req,res,next)=>{
    const {productId, variantId} = req.params

    // Load siblings for the size selector; lean returns options as plain objects.
    const product = await productModel.findOne({
        _id:productId,
        'variants._id':variantId,
        isDeleted:false
    }).select('variants description specifications brandName ratings categoryId subCategoryId brandId slug').lean()
    if(!product)
    {
        return next(new Error('Product or variant not found', {cause:404}))
    }

    const variant = product.variants.find(item => String(item._id).toLowerCase() === variantId.toLowerCase())
    if(!variant)
    {
        return next(new Error('Variant not found', {cause:404}))
    }
    const toOptions = options => options instanceof Map
        ? Object.fromEntries(options)
        : Object.fromEntries(Object.entries(options || {}))
    const selectedVariantOptions = toOptions(variant.options)
    const {size: selectedSize, ...selectedOptions} = selectedVariantOptions
    const availableSizes = []

    if(typeof selectedSize === 'string' && selectedSize.trim())
    {
        for(const item of product.variants)
        {
            const {size, ...otherOptions} = toOptions(item.options)
            const isActive = item.isActive === true || item.isActive === undefined

            if(!isActive || !(item.stock > 0)) continue
            if(typeof size !== 'string' || !size.trim()) continue
            // Compare color, material, etc. after removing size from both objects.
            if(!isDeepStrictEqual(selectedOptions, otherOptions)) continue

            availableSizes.push({size, variantId:item._id})
        }
    }

    return res.status(200).json({
        message:'Variant retrieved successfully',
        productId:product._id,
        description:product.description,
        specifications:product.specifications || [],
        brandName:product.brandName,
        ratings:product.ratings,
        categoryId:product.categoryId,
        subCategoryId:product.subCategoryId,
        brandId:product.brandId,
        slug:product.slug,
        variant: {...variant, options:selectedVariantOptions},
        availableSizes,
        availableVariants: product.variants
            // Keep sold-out variants in the option catalog so their color/size
            // values remain visible; the UI can still indicate stock state.
            .filter(item => item.isActive === true || item.isActive === undefined)
            .map(item => ({
                variantId: item._id,
                options: toOptions(item.options),
                stock: item.stock || 0
            }))
    })
})
// name , description , slug , mainImage , price , finalPrice , stock , subCategoryId , brandId
// remains createdBy , variants , sku
// check subImage promises
export const addProduct = asyncHandler(async(req,res,next)=>{
    
    const {categoryId,subCategoryId , brandId , name , description , 
        price} = req.body

        
        
    const data = {}
    const variants = {}
    const subCategory = await subCategoryModel.findOne({ _id: subCategoryId , categoryId })
    if(!subCategory)
    {
        return next(new Error("sub category not found"))
    }
     const brand = await brandModel.findById(brandId)
    if(!brand)
    {
        return next(new Error("brand not found"))
    }
    

    if(req.body.specifications)
    {// no requirement only must be string
         data.specifications = JSON.parse(req.body.specifications)
    }
    if(req.body.options)
    {// no requirement only must be string
        variants.options = JSON.parse(req.body.options)
    }

    if(req.body.stock !== undefined)
    {
        variants.stock = Number(req.body.stock)
    }
    if(req.body.discount)
    {
        variants.discount = Number(req.body.discount)
    }// variants =>  price - finalPrice - discount - stock - sku - mainImage - subImage - options


    // faster in upload but need clean up if upload failed in any of the images
     const cloudId = nanoid()
    const [mainImage, subImages] = await Promise.all([
        cloudinary.uploader.upload(req.files.mainImage[0].path, {
            folder: `${process.env.APP}/product/${cloudId}`
        }),
        Promise.all((req.files.subImages || []).map(image =>
            cloudinary.uploader.upload(image.path, {
                folder: `${process.env.APP}/product/${cloudId}/subImages`
            })
        ))
    ])

    variants.mainImage = {secure_url:mainImage.secure_url , public_id:mainImage.public_id}
    if(subImages.length > 0)
    {
        variants.subImages = subImages.map(images =>{
            return {secure_url:images.secure_url , public_id:images.public_id}
        })
    }// compare them later

    // const {secure_url , public_id} = await cloudinary.uploader.upload
    // (req.files.mainImage[0].path , {folder:`${process.env.APP}/product/${cloudId}`})
    
    // if(req.files?.subImages !== undefined)
    // {
    //     const timerLabel = `subimages:${cloudId}`
    //     console.time(timerLabel)
    //     try {
    //         const uploadedImages = await Promise.all(
    //             req.files.subImages.map(image =>
    //                 cloudinary.uploader.upload(image.path, {
    //                     folder: `${process.env.APP}/product/${cloudId}/subImages`
    //                 })
    //             )
    //         )
    //         variants.subImages = uploadedImages.map(
    //             ({ secure_url, public_id }) => ({ secure_url, public_id })
    //         )
    //     } finally {
    //         console.timeEnd(timerLabel)
    //     }
    // }
    
    variants.sku = `SKU-${generateSku()}`
    //  variants.mainImage = {secure_url , public_id}
    data.slug = slugify(name)
    variants.price = Number(price)
    variants.finalPrice = Number.parseFloat(price - (((req.body.discount || 0 ) / 100) * price)).toFixed(2)
    data.description = description
    variants.name = name.trim()
    data.cloudId = cloudId
    data.brandId = brandId
    data.subCategoryId = subCategoryId
    data.categoryId = categoryId
    data.variants = variants
    data.createdBy = req.user.id
    data.brandName = brand.name
    

     const product = await productModel.create(data)
     
    return res.json({message:"product created successfully",product})
})

// variants =>  price - finalPrice - discount - stock - sku - mainImage - subImage - options
export const addVariants = asyncHandler(async(req,res,next)=>{
    const {productId} = req.params
    const {name, price} = req.body
    const variants = {name: name.trim()}

    const product = await productModel.findOne({_id:productId, createdBy:req.user.id})
    if(!product)
    {
        return next(new Error("product not found"))
    }

     if(req.body.stock !== undefined)
    {
        variants.stock = Number(req.body.stock)
    }
    if(req.body.discount)
    {
        variants.discount = Number(req.body.discount)
    }
     if(req.body.options)
    {// no requirement only must be string
        variants.options = JSON.parse(req.body.options)
    }
    try {
        Object.assign(variants, await resolveVariantImages(product, req.body, req.files));
    } catch(error) {
        if(error.cause === 400 || error.cause === 404) return next(error);
        throw error;
    }

   // variants.mainImage = {secure_url , public_id}
    variants.sku = `SKU-${generateSku()}`
    variants.finalPrice = Number.parseFloat(price - (price * ((req.body.discount || 0) / 100))).toFixed(2)
    variants.price = price

     const addProduct = await productModel.findOneAndUpdate(
        {_id:productId, createdBy:req.user.id},
        {$push:{variants}},
        {returnDocument:'after'}
     )

    return res.json({message:"variant added successfully",addProduct})
})

export const updateVariant = asyncHandler(async(req,res,next)=>{
    const {productId , variantId} = req.params
    // const {} = req.body

    const variants = {}
     const hasPrice = req.body.price !== undefined
     const hasdiscount = req.body.discount !== undefined

    const product = await productModel.findOne({
        _id:productId,
        'variants._id':variantId,
        createdBy:req.user.id
    })
    if(!product)
    {
        return next(new Error("product not found"))
    }

    

    const variantObj = product.variants.find(variant => String(variant._id) === (variantId))

    

    if(req.body.name !== undefined)
    {
        variants['variants.$.name'] = req.body.name.trim()
    }

    if(hasPrice || hasdiscount)
    {
        const price = hasPrice ? req.body.price : variantObj.price
        const discount = hasdiscount ? req.body.discount : variantObj.discount ?? 0

        if(hasPrice)
        {
            variants['variants.$.price'] = price
        }

        if(hasdiscount)
        {
            variants['variants.$.discount'] = discount
        }

        variants['variants.$.finalPrice'] = Number.parseFloat(price - (price * ((discount) / 100))).toFixed(2)
    }

    // 3ayzeen ngeeb el7aga elgowa variants

     if(req.body.stock !== undefined)
    {
        variants['variants.$.stock'] = Number(req.body.stock)
    }
//     if(price && discount)
//     {
//         variants.finalPrice = Number(price) - (Number(price) * (Number(discount) / 100))
//         variants.price = price
//         variants.discount = discount
//     }
//     else{
//      if(price)
//      {
//         variants.price = price
//         variants.finalPrice = Number(price) - (Number(price) * ((Number(product.discount) || 0) / 100))
//      }
//      if(req.body.discount)
//      {
//         variants.discount = Number(discount)
//         variants.finalPrice = Number(product.price) - (Number(product.price) * (Number(discount) / 100))
//      }
// }
     if(req.body.options)
    { // everytime if it will be updated , it will be updated as new one
        variants['variants.$.options'] = JSON.parse(req.body.options)
    } // frontend hygeeb lel user data eladeema mn database wel user y3dl aw add new option

    let images;
    try {
        images = await resolveVariantImages(product, req.body, req.files, variantObj);
    } catch(error) {
        if(error.cause === 400 || error.cause === 404) return next(error);
        throw error;
    }
    for(const [key,value] of Object.entries(images)) variants['variants.$.'+key] = value;

    const updateProduct = await productModel.findOneAndUpdate(
        {_id:productId, 'variants._id':variantId, createdBy:req.user.id},
        {$set:variants},
        {returnDocument:'after'}
    )

    if(!updateProduct) return next(new Error("variant not found", {cause:404}))
        
    await releaseUnreferencedImages(variantObj, updateProduct)
    return res.json({message:"variant updated successfully",updateProduct})
})

export const deleteVariant = asyncHandler(async(req,res,next)=>{
    const {productId,variantId} = req.params

    const product = await productModel.findOneAndUpdate(
        {_id:productId, 'variants._id':variantId, createdBy:req.user.id},
        {$pull:{variants:{_id:variantId}}},
        {returnDocument:'after'}
    )
    if(!product)
    {
        return next(new Error("variant not found"))
    }

    return res.json({message:"variant deleted successfully",product})
})


// Product-level description, brand, subcategory and specifications.
export const updateProduct = asyncHandler(async(req,res,next)=>{
    const {productId} = req.params
    const product = await productModel.findOne({_id:productId, createdBy:req.user.id})
    if(!product) return next(new Error('product not found', {cause:404}))
    const data = {}
    if(req.body.subCategoryId) {
        const subcategory = await subCategoryModel.findById(req.body.subCategoryId)
        if(!subcategory) return next(new Error('subCategory not found', {cause:404}))
        data.subCategoryId = subcategory._id
        data.categoryId = subcategory.categoryId
    }
    if(req.body.brandId) {
        const brand = await brandModel.findById(req.body.brandId)
        if(!brand) return next(new Error('brand not found', {cause:404}))
        data.brandId = brand._id
        data.brandName = brand.name
    }
    if(req.body.description !== undefined) data.description = req.body.description
    if(req.body.specification !== undefined) data.specifications = JSON.parse(req.body.specification)
    const updatedProduct = await productModel.findOneAndUpdate(
        {_id:productId, createdBy:req.user.id}, {$set:data}, {returnDocument:'after', runValidators:true}
    )
    return res.json({message:'updated successfully', product:updatedProduct})
})

export const getSellerProducts = asyncHandler(async(req,res)=>{
    const page = Number(req.query.page) || 1
    const size = Number(req.query.size) || 50
    const filter = {createdBy:req.user.id, isDeleted:false}
    const results = await productModel.find(filter).sort({createdAt:-1}).skip((page-1)*size).limit(size+1).lean()
    return res.json({products:results.slice(0,size), pagination:{page,size,hasMore:results.length>size}})
})

// const selectedOptions = variant.options || {}
//     const optionKeys = Object.keys(selectedOptions).filter(key => key !== 'size')
//     const availableSizes = typeof selectedOptions.size === 'string' && selectedOptions.size.trim()
//         ? product.variants.filter(item => {
//             const options = item.options || {}
//             const otherKeys = Object.keys(options).filter(key => key !== 'size')
//             return (item.isActive === true || item.isActive === undefined) && item.stock > 0 &&
//                 typeof options.size === 'string' && options.size.trim() &&
//                 otherKeys.length === optionKeys.length &&
//                 optionKeys.every(key => Object.hasOwn(options, key) && options[key] === selectedOptions[key])
//         }).map(item => ({size:item.options.size, variantId:item._id}))
//         : []


//  const {size: selectedSize, ...selectedOptions} = variant.options || {}
    // const availableSizes = []

    // if(typeof selectedSize === 'string' && selectedSize.trim())
    // {
    //     for(const item of product.variants)
    //     {
    //         const {size, ...otherOptions} = item.options || {}
    //         const isActive = item.isActive === true || item.isActive === undefined

    //         if(!isActive || !(item.stock > 0)) continue
    //         if(typeof size !== 'string' || !size.trim()) continue
    //         // Compare color, material, etc. after removing size from both objects.
    //         if(!isDeepStrictEqual(selectedOptions, otherOptions)) continue

    //         availableSizes.push({size, variantId:item._id})
    //     }
    // }
