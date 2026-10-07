import Joi from 'joi'
import { imageFile, name, id } from '../../Utills/validationSchemas.js'

// categoryId comes from /category/:categoryId/subcategory via mergeParams.
export const getSubCategories = Joi.object({
    categoryId: id.required(),
     page: Joi.number().integer().min(1).max(1000000),
     size: Joi.number().integer().min(1).max(100),
     sort: Joi.string().pattern(/^-?(?:name|createdAt)(?:,-?(?:name|createdAt))*$/)
}).required()

export const addSubCategory = Joi.object({
    categoryId: id.required(),
    name: name.required(),
    file: imageFile.required()
}).required()

export const updateSubCategory = Joi.object({
    categoryId: id.required(),
    subCategoryId: id.required(),
    name,
    file: imageFile
}).or('name', 'file').required()
