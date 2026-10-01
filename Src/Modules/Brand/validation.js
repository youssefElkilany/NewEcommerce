import Joi from 'joi'
import { imageFile, name, id } from '../../Utills/validationSchemas.js'

export const addBrand = Joi.object({
    name: name.required(),
    file: imageFile.required()
}).required()

export const updateBrand = Joi.object({
    brandId: id.required(),
    name,
    file: imageFile
}).or('name', 'file').required()
