import Joi from 'joi'
import { password } from '../../Utills/validationSchemas.js'

const email = Joi.string().trim().lowercase().email().required()
// Do not trim passwords. bcrypt supports at most 72 UTF-8 bytes.

const cPassword = Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords must match'
})
// Shape only: the controller still verifies the JWT signature and expiration.
const token = Joi.string().pattern(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/).required()

export const signUp = Joi.object({
    name: Joi.string().trim().min(1).required(),
    email,
    password,
    cPassword,
    phone: Joi.string().trim().pattern(/^\+?[0-9][0-9 ()-]{5,18}[0-9]$/)
}).required()

// Login accepts existing passwords without imposing the new-password policy.
export const login = Joi.object({
    email,
    password: Joi.string().required()
}).required()

export const confirmEmail = Joi.object({ token }).required()
export const ResendEmail = confirmEmail
export const forgetPasswordCode = Joi.object({ email }).required()
export const forgetPasswordLink = forgetPasswordCode

export const resetPasswordCode = Joi.object({
    email,
    password,
    cPassword,
    otp: Joi.string().pattern(/^\d{4}$/).required()
}).required()

export const resetPasswordLink = Joi.object({ token, password, cPassword }).required()
