import Joi from 'joi'
import { id } from '../../Utills/validationSchemas.js'

const phone = Joi.string().trim().pattern(/^\+?[0-9][0-9 ()-]{5,18}[0-9]$/)

export const createOrder = Joi.object({
    // Omit products to order the authenticated user's cart.
    products: Joi.array().items(Joi.object({
        productId: id.required(),
        variantId: id.required(),
        quantity: Joi.number().integer().positive().min(1).max(99).required()
    })).min(1).unique((a, b) => a.variantId.toLowerCase() === b.variantId.toLowerCase()),
    code: Joi.string().trim().min(1),
    phone: Joi.alternatives().try(phone, Joi.array().items(phone).min(1).unique()).required(),
    addressId: id,
    paymentMethod: Joi.string().valid('Cash', 'Card'),
    note: Joi.string().trim().allow('')
}).required()

// Stripe verifies /webhook using the signature and the raw request body.

export const transactionalCheckout = createOrder.keys({ addressId: id.required() })
export const reconcileCheckout = Joi.object({ orderId: id.required(), cancel: Joi.boolean().default(false) }).required()
export const orderPayment = Joi.object({ orderId: id.required() }).required()

// Checkout 2 requires an explicit payment choice and never accepts client totals.
export const checkout2Create = transactionalCheckout.keys({
    products: createOrder.extract('products').max(100),
    paymentMethod: Joi.string().valid('Cash', 'Card').required(),
    phone: Joi.alternatives().try(phone, Joi.array().items(phone).min(1).max(3).unique()).required(),
    code: Joi.string().trim().min(1).max(100),
    note: Joi.string().trim().max(1000).allow('')
})
export const checkout2Reconcile = Joi.object({
    orderId: id.required(), cancel: Joi.boolean().strict()
}).required()
export const checkoutKey = Joi.string().pattern(/^[A-Za-z0-9_-]{8,128}$/).required()
export const validateCheckoutKey = (req,res,next) => {
    const {error} = checkoutKey.validate(req.get('Idempotency-Key'))
    if(error) return res.status(400).json({message:'Validation Error',validationErr:[{path:['Idempotency-Key'],message:'Provide an Idempotency-Key of 8-128 letters, digits, underscores or hyphens'}]})
    return next()
}
export const validateCheckoutWebhook = (req,res,next) => {
    const {error} = Joi.string().max(4096).pattern(/(?:^|,)t=\d+(?:,|$)/).pattern(/(?:^|,)v1=[a-f0-9]{64}(?:,|$)/).required().validate(req.get('stripe-signature'))
    if(error || !Buffer.isBuffer(req.body) || req.body.length===0)
        return res.status(400).json({message:'A Stripe signature and nonempty raw request body are required'})
    return next()
}

export const myOrders = Joi.object({
    page:Joi.number().integer().min(1).max(1000000),
    size:Joi.number().integer().min(1).max(50)
}).required()
