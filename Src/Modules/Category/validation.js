import Joi from 'joi'
import { imageFile, name, id } from '../../Utills/validationSchemas.js'

export const getCategory = Joi.object({
     page: Joi.number().integer().min(1).max(1000000),
     size: Joi.number().integer().min(1).max(100),
     sort: Joi.string().pattern(/^-?(?:name|createdAt)(?:,-?(?:name|createdAt))*$/),
}).required()

export const addCategory = Joi.object({
    name: name.required(),
    file: imageFile.required()
}).required()

export const updateCategory = Joi.object({
    categoryId: id.required(),
    name,
    file: imageFile
}).or('name', 'file').required()
