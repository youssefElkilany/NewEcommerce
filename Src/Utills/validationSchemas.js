import Joi from 'joi'
import { Types } from 'mongoose'

export const objectId = (value, helper) => {
    return Types.ObjectId.isValid(value) ? value : helper.message('In-valid objectId')
}
export const password = Joi.string()
  .min(8)
  .max(64)
  .pattern(/[a-z]/)
  .pattern(/[A-Z]/)
  .pattern(/[0-9]/)
  .pattern(/[^a-zA-Z0-9]/)
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 64 characters',
    'string.pattern.base':
      'Password must contain uppercase, lowercase, number, and special character',
    'any.required': 'Password is required'
  });
export const name = Joi.string().trim().min(1)
export const id = Joi.string().custom(objectId)

// Multer adds metadata such as destination, filename, and encoding.
export const imageFile = Joi.object({
    size: Joi.number().integer().positive().required(),
        path: Joi.string().required(),
        filename: Joi.string().required(),
        destination: Joi.string().required(),
        mimetype: Joi.string().required(),
        encoding: Joi.string().required(),
        originalname: Joi.string().required(),
        fieldname: Joi.string().required()
})

// Controllers JSON.parse these multipart fields, so keep the validated string.
export const jsonString = (schema) => Joi.string().custom((value, helpers) => {
    try {
        const result = schema.validate(JSON.parse(value), { convert: false })
        if (result.error) return helpers.error('any.invalid')
        return value
    } catch {
        return helpers.error('any.invalid')
    }
}, 'JSON structure validation').messages({
    'any.invalid': '{{#label}} must be a JSON string with the expected structure'
})
