
// if (
//     !isObjectIdOrHexString(productId) ||
//     !isObjectIdOrHexString(variantId)
//   ) {
//     return next(new Error('Invalid product or variant ID', { cause: 400 }));
//   }

import { id } from "../../Utills/validationSchemas.js";

// can be used in validation


export const addToCart = Joi.object({
    productId: id.required(),
    variantId: id.required(),
    quantity: Joi.number().integer().min(1).default(1)
}).required()