import Joi from 'joi'
import { imageFile, name, id } from '../../Utills/validationSchemas.js'

export const getCategory = Joi.object({}).required()

export const addCategory = Joi.object({
    name: name.required(),
    file: imageFile.required()
}).required()

export const updateCategory = Joi.object({
    categoryId: id.required(),
    name,
    file: imageFile
}).or('name', 'file').required()
