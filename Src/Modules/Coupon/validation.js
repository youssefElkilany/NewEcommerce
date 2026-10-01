
import Joi from 'joi';
import { id } from '../../Utills/validationSchemas.js';

const couponId = id.lowercase();

export const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  discountType: Joi.string().valid('percentage', 'fixed').required(),
  discountValue: Joi.number().when('discountType', {
    is: 'percentage',
    then: Joi.number().min(0).max(100),
    otherwise: Joi.number().positive()
  }).required(),
  maxDiscountAmount: Joi.when('discountType', {
    is: 'percentage',
    then: Joi.number().min(0).allow(null).default(null),
    otherwise: Joi.forbidden()
  }),
  minOrderAmount: Joi.number().min(0).default(0),
  expireDate: Joi.date().iso().greater('now').required(),
  usageLimit: Joi.number().integer().positive().allow(null).default(null),
  usageLimitPerUser: Joi.number().integer().positive().default(1),
  applicableProducts: Joi.array().items(couponId).unique().default([]),
  applicableCategories: Joi.array().items(couponId).unique().default([]),
  excludedProducts: Joi.array().items(couponId).unique().default([])
}).required();

export const validateCreateCoupon = (req, res, next) => {
  const { error, value } = createCouponSchema.validate(req.body, {
    abortEarly: false
  });

  if (error) {
    return res.status(400).json({
      message: 'Validation Error',
      validationErr: error.details
    });
  }

  // Keep Joi's normalized values, numeric conversions, and defaults.
  req.body = value;
  return next();
};
