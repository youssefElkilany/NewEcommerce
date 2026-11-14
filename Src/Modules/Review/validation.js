import Joi from 'joi';
import {id} from '../../Utills/validationSchemas.js';
export const createReview=Joi.object({
    productId:id.required(),orderId:id.required(),
    rating:Joi.number().integer().min(1).max(5).required(),
    comment:Joi.string().trim().min(1).max(2000).required()
}).required();


export const updateReview=Joi.object({
    reviewId:id.required(),orderId:id.required(),
    rating:Joi.number().integer().min(1).max(5).required(),
    comment:Joi.string().trim().min(1).max(2000).required()
}).required();