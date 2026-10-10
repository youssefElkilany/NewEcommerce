import Joi from 'joi'
import { imageFile, jsonString, name, id } from '../../Utills/validationSchemas.js'

const options = jsonString(Joi.object().pattern(Joi.string().min(1), Joi.string()).required())
const specifications = jsonString(Joi.array().items(Joi.object({
    name: name.required(),
    value: Joi.any().required()
})).required())

const variantFields = {
    price: Joi.number().min(0),
    discount: Joi.number().min(0).max(100),
    stock: Joi.number().integer().min(0),
    options
}

const variantImages = Joi.object({
    mainImage: Joi.array().items(imageFile).length(1),
    subImages: Joi.array().items(imageFile).min(1).max(4)
}).min(1)

const requiredVariantImages = variantImages.keys({
    mainImage: Joi.array().items(imageFile).length(1).required()
}).required()

export const getProducts = Joi.object({
    page: Joi.number().integer().min(1).max(1000000),
    size: Joi.number().integer().min(1).max(100),
    count: Joi.boolean(),
    search: Joi.string().trim().min(1).max(100),
    brandId: id,
    categoryId: id,
    subCategoryId: Joi.alternatives().try(id, Joi.array().items(id.required()).min(1)),
    minPrice:variantFields.price,
    maxPrice:variantFields.price,
    discount: variantFields.discount,
    rating: Joi.number().min(0).max(5),
    sort: Joi.string().pattern(/^-?(?:name|createdAt|ratings\.average|discount|finalPrice)(?:,-?(?:name|createdAt|ratings\.average|discount|finalPrice))*$/),
    fields: Joi.string().pattern(/^(?:_id|name|description|slug|brandId|subCategoryId|variants|ratings|createdAt|updatedAt)(?:,(?:_id|name|description|slug|brandId|subCategoryId|variants|ratings|createdAt|updatedAt))*$/)
}).required()

export const addProduct = Joi.object({
    name: name.required(),
    description: Joi.string().trim().min(1).required(),
    categoryId: id.required(),
    subCategoryId: id.required(),
    brandId: id.required(),
    specifications,
    ...variantFields,
    price: variantFields.price.required(),
    file: requiredVariantImages
}).required()

export const updateProduct = Joi.object({
    productId: id.required(),
    name,
    description: Joi.string().trim().min(1),
    subCategoryId: id,
    brandId: id,
    // The current update controller uses the singular field name.
    specification: specifications,
    file: Joi.object({
        image: Joi.array().items(imageFile).length(1),
        subImages: Joi.array().items(imageFile).min(1).max(4)
    })
}).or('name', 'description', 'subCategoryId', 'brandId', 'specification').required()

export const addVariants = Joi.object({
    productId: id.required(),
    ...variantFields,
    price: variantFields.price.required(),
    file: requiredVariantImages
}).required()

export const getProductVariant = Joi.object({
    productId: id.required(),
    variantId: id.required()
}).required()

export const updateVariant = Joi.object({
    productId: id.required(),
    variantId: id.required(),
    ...variantFields,
    // An empty Multer files object does not count as an update.
    file: variantImages.empty(Joi.object().length(0))
}).or('price', 'discount', 'stock', 'options', 'file').required()

export const deleteVariant = getProductVariant
