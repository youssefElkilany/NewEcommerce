import Joi from 'joi'
import { imageFile, name, id } from '../../Utills/validationSchemas.js'

// categoryId comes from /category/:categoryId/subcategory via mergeParams.
export const getSubCategories = Joi.object({
    categoryId: id.required()
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
