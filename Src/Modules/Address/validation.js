import Joi from 'joi'

const locationSchema = Joi.object({
    type:Joi.string().valid('Point').default('Point'),
    coordinates:Joi.array().ordered(
        Joi.number().min(-180).max(180).required(),
        Joi.number().min(-90).max(90).required()
    ).length(2).required()
})

const optionalText = Joi.string().trim().allow('')

const addressShape = {
    label:Joi.string().valid('home','work','other'),
    name:Joi.string().trim().min(1),
    phone:Joi.string().trim().min(1),
    country:Joi.string().trim().min(1),
    city:Joi.string().trim().min(1),
    street:Joi.string().trim().min(1),
    buildingNumber:optionalText,
    district:optionalText,
    apartmentNumber:optionalText,
    floor:optionalText,
    landmark:optionalText,
    deliveryInstructions:Joi.string().trim().max(300).allow(''),
    location:locationSchema,
    isDefault:Joi.boolean()
}

const createAddressSchema = Joi.object({
    ...addressShape,
    name:addressShape.name.required(),
    phone:addressShape.phone.required(),
    city:addressShape.city.required(),
    street:addressShape.street.required()
}).required()

const updateAddressSchema = Joi.object(addressShape).min(1).required()

const addressIdSchema = Joi.string().hex().length(24).required()

const validateBody = (schema) => (req,res,next) => {
    const {error,value} = schema.validate(req.body,{abortEarly:false})

    if(error)
    {
        return res.status(400).json({
            message:'Validation Error',
            validationErr:error.details
        })
    }

    req.body = value
    return next()
}

export const validateCreateAddress = validateBody(createAddressSchema)
export const validateUpdateAddress = validateBody(updateAddressSchema)

export const validateAddressId = (req,res,next) => {
    const {error,value} = addressIdSchema.validate(req.params.addressId)

    if(error)
    {
        return res.status(400).json({
            message:'Validation Error',
            validationErr:error.details
        })
    }

    req.params.addressId = value
    return next()
}
