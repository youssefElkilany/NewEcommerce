import Joi from 'joi';
import { normalizeEgyptPhone } from '../Address/egypt.js';
export const updateProfile = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().allow('').custom(normalizeEgyptPhone)
}).min(1).required();
