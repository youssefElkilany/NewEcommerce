import Joi from 'joi';
import { id } from '../../Utills/validationSchemas.js';

export const addToCart = Joi.object({ productId: id.required(), variantId: id.required(), quantity: Joi.number().integer().min(1).max(99).default(1) }).required();
export const updateCartItem = Joi.object({ productId: id.required(), variantId: id.required(), quantity: Joi.number().integer().min(1).max(99).required() }).required();
export const cartItemParams = Joi.object({ productId: id.required(), variantId: id.required() }).required();
