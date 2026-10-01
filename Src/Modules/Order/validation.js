import Joi from 'joi'
import { id } from '../../Utills/validationSchemas.js'

const phone = Joi.string().trim().pattern(/^\+?[0-9][0-9 ()-]{5,18}[0-9]$/)

export const createOrder = Joi.object({
    // Omit products to order the authenticated user's cart.
    products: Joi.array().items(Joi.object({
        productId: id.required(),
        variantId: id.required(),
        quantity: Joi.number().integer().positive().required()
    })).min(1).unique((a, b) => a.variantId.toLowerCase() === b.variantId.toLowerCase()),
    code: Joi.string().trim().min(1),
    phone: Joi.alternatives().try(phone, Joi.array().items(phone).min(1).unique()).required(),
    addressId: id,
    paymentMethod: Joi.string().valid('Cash', 'Card'),
    note: Joi.string().trim().allow('')
}).required()

// Stripe verifies /webhook using the signature and the raw request body.
