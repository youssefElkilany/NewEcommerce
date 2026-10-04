import subCategoryModel from '../../../../DB/Models/subCategory.model.js'
import brandModel from '../../../../DB/Models/brand.model.js'
import { asyncHandler } from '../../../Utills/errorHandler.js'
import productModel from '../../../../DB/Models/product.model.js'
import cloudinary from '../../../Utills/Cloudinary.js'
import { nanoid , customAlphabet } from 'nanoid'
import slugify from 'slugify'
import AggregationApiFeatures from '../../../Utills/AggregationApiFeatures.js'

const generateSku = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  10
);  

export const getrelatedBrands = asyncHandler(async(req,res,next)=>{

    const {subCategoryId} = req.params

    const brands = await productModel.distinct('brandName', {subCategoryId:subCategoryId})
    console.log({brands})
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
    const products = await apiFeatures.mongooseQuery
   
    return res.status(200).json({
        products
    })
})

// general search like name , description view first variant only
// variants search like price , stock , options view all variants that match the search
export const getProduct = asyncHandler(async(req,res,next)=>{

    const conditions = []
    for (const [parameter, field, operator] of [
        ['minStock', 'stock', '$gte'],
        ['maxStock', 'stock', '$lte'],
        ['minPrice', 'price', '$gte'],
        ['maxPrice', 'price', '$lte']
    ]) {
        const value = req.query[parameter]
        if (value === undefined) continue

        if (typeof value !== 'string' || !value.trim() ||
            !Number.isFinite(Number(value)) || Number(value) < 0) {
            return next(new Error(`${parameter} must be a non-negative number`, {cause:400}))
        }
        conditions.push({[operator]: [`$$variant.${field}`, Number(value)]})
    }

    // For example: ?options.color=Black&options.size=M
    for (const [key, value] of Object.entries(req.query)) {
        if (!key.startsWith('options.')) continue
        const option = key.slice('options.'.length)
        if (!/^[a-zA-Z0-9_-]+$/.test(option) || typeof value !== 'string') {
            return next(new Error('Invalid variant option filter', {cause:400}))
        }
        conditions.push({$eq: [`$$variant.options.${option}`, {$literal:value}]})
    }

    // --------------- search
    const match = {isDeleted:false}
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
        const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        match.$or = [
            {name:{$regex:search, $options:'i'}},
            {description:{$regex:search, $options:'i'}}
        ]
    }
// ----------------- search
    const pipeline = [
        {$match:match},
        {$set:{variants:conditions.length
            ? {$filter:{input:'$variants', as:'variant', cond:{$and:conditions}}}
            : {$slice:['$variants', 1]}
        }}
    ]
    // Apply every condition to the same variant and omit products with no matches.
    if (conditions.length) pipeline.push({$match:{'variants.0':{$exists:true}}})

    const product = await productModel.aggregate(pipeline)

    return res.json({product})
})

export const getProductVariant = asyncHandler(async(req,res,next)=>{
    const {productId , variantId} = req.params

    // Return only the variant matched by variants._id, not the full array.
    const product = await productModel.findOne({
        _id:productId,
        'variants._id':variantId
    }).select('variants.$').lean()
    

    if(!product)
    {
        return next(new Error('Product or variant not found', {cause:404}))
    }

    return res.status(200).json({
        message:'Variant retrieved successfully',
        productId:product._id,
        variant:product.variants[0],
        // product
    })
})
// name , description , slug , mainImage , price , finalPrice , stock , subCategoryId , brandId
// remains createdBy , variants , sku
export const addProduct = asyncHandler(async(req,res,next)=>{
    
    const {subCategoryId , brandId , name , description , 
        price} = req.body

        
        
    const data = {}
    const variants = {}
    const subCategory = await subCategoryModel.findById(subCategoryId)
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

    if(req.body.stock)
    {
        variants.stock = Number(req.body.stock)
    }
    if(req.body.discount)
    {
        variants.discount = Number(req.body.discount)
    }// variants =>  price - finalPrice - discount - stock - sku - mainImage - subImage - options


    // faster in upload but need clean up if upload failed in any of the images
     const cloudId = nanoid()
     const [mainImage , subImages] = await Promise.all([
        cloudinary.uploader.upload
    (req.files.mainImage[0].path , {folder:`${process.env.APP}/product/${cloudId}`}),
    req.files.subImages !== undefined ? req.files.subImages.map(image =>
                    cloudinary.uploader.upload(image.path, {
                        folder: `${process.env.APP}/product/${cloudId}/subImages`
                    })
                ) : []
     ])

    data.mainImage = {secure_url:mainImage.secure_url , public_id:mainImage.public_id}
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
    data.name = name
    data.cloudId = cloudId
    data.brandId = brandId
    data.subCategoryId = subCategoryId
    data.variants = variants
    data.createdBy = req.user.id
    data.brandName = brand.name
    

     const product = await productModel.create(data)
     
    return res.json({message:"product created successfully",product})
})

// variants =>  price - finalPrice - discount - stock - sku - mainImage - subImage - options
export const addVariants = asyncHandler(async(req,res,next)=>{
    const {productId} = req.params
    const {price} = req.body
    const variants = {}

    const product = await productModel.findOne({_id:productId, createdBy:req.user.id})
    if(!product)
    {
        return next(new Error("product not found"))
    }

     if(req.body.stock)
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

    //  const {secure_url , public_id} = await cloudinary.uploader.upload
    // (mainImage[0].path , {folder:`${process.env.APP}/product/${product.cloudId}`})


   // faster in upload but need clean up if upload failed in any of the images
     const cloudId = nanoid()
     const [mainImage , subImages] = await Promise.all([
        cloudinary.uploader.upload
    (req.files.mainImage[0].path , {folder:`${process.env.APP}/product/${cloudId}`}),
    req.files.subImages !== undefined ? req.files.subImages.map(image =>
                    cloudinary.uploader.upload(image.path, {
                        folder: `${process.env.APP}/product/${cloudId}/subImages`
                    })
                ) : []
     ])
     variants.mainImage = {secure_url:mainImage.secure_url , public_id:mainImage.public_id}

    if(subImages.length > 0)
    {
        variants.subImages = subImages.map(images =>{
            return {secure_url:images.secure_url , public_id:images.public_id}
        })
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
     const {mainImage , subImages} = req.files
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

     if(req.body.stock)
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

    if(mainImage) // ngrb .length mara tanya 
    {
         const {secure_url , public_id} = await cloudinary.uploader.upload
    (mainImage[0].path , {folder:`${process.env.APP}/product/${product.cloudId}`})
    await cloudinary.uploader.destroy(variantObj.mainImage.public_id)
    variants['variants.$.mainImage'] = {secure_url , public_id}
    }
    if(subImages)
    { // nb2a nzbt feeha 3adad images max 5 -> only add images

    }

    const updateProduct = await productModel.findOneAndUpdate(
        {_id:productId, 'variants._id':variantId, createdBy:req.user.id},
        {$set:variants},
        {returnDocument:'after'}
    )

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


// name , slug , description , specification
export const updateProduct = asyncHandler(async(req,res,next)=>{
    const {productId} = req.params

    const product = await productModel.findOne({_id:productId, createdBy:req.user.id})
     if(!product)
    {
        return next(new Error("variant not found"))
    }
    const data = {}
    if(req.body.subCategoryId)
    {
        const subcat = await productModel.findById(req.body.subCategoryId)
         if(!subcat)
            {
                return next(new Error("subCategory not found"))
            }
    }
    if(req.body.brandId)
    {
        const brand = await productModel.findById(req.body.brandId)
         if(!brand)
            {
                return next(new Error("brand not found"))
            }
    }

    if(req.body.name)
    {
        data.name = req.body.name
    }
    if(req.body.description)
    {
        data.description = req.body.description
    }
    if(req.body.specification)
    {
        data.specification = req.body.specification
    }
    // not tested yet
    const updateProduct = await productModel.updateOne(
        {_id:productId, createdBy:req.user.id},
        {data}
    )
    if(!updateProduct.modifiedCount)
    {
        return next(new Error("nothing is updated"))
    }

    return res.json({message:"updated successfully"})

})
