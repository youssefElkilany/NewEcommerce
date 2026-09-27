import addressModel from '../../../../DB/Models/address.model.js'
import { asyncHandler } from '../../../Utills/errorHandler.js'

const addressFields = [
    'label',
    'name',
    'phone',
    'country',
    'city',
    'street',
    'buildingNumber',
    'district',
    'apartmentNumber',
    'floor',
    'landmark',
    'deliveryInstructions',
    'location',
    'isDefault'
]

const pickAddressFields = (body) => {
    const data = {}

    for (const field of addressFields) {
        if (Object.hasOwn(body, field)) {
            data[field] = body[field]
        }
    }

    return data
}

export const createAddress = asyncHandler(async(req,res,next)=>{
    const userId = req.user.id
    const data = pickAddressFields(req.body)

    const hasAddress = await addressModel.exists({userId})
    data.isDefault = data.isDefault === true || !hasAddress

    if(data.isDefault)
    {
        await addressModel.updateMany({userId},{$set:{isDefault:false}})
    }

    const address = await addressModel.create({...data,userId})

    return res.status(201).json({
        message:'address created successfully',
        address
    })
})

export const getAddresses = asyncHandler(async(req,res,next)=>{
    const addresses = await addressModel
        .find({userId:req.user.id})
        .sort({isDefault:-1,createdAt:-1})

    return res.status(200).json({
        message:'addresses retrieved successfully',
        addresses
    })
})

export const getAddress = asyncHandler(async(req,res,next)=>{
    const address = await addressModel.findOne({
        _id:req.params.addressId,
        userId:req.user.id
    })

    if(!address)
    {
        return next(new Error('address not found',{cause:404}))
    }

    return res.status(200).json({
        message:'address retrieved successfully',
        address
    })
})

export const updateAddress = asyncHandler(async(req,res,next)=>{
    const {addressId} = req.params
    const userId = req.user.id
    const data = pickAddressFields(req.body)

    const address = await addressModel.findOne({_id:addressId,userId})
    if(!address)
    {
        return next(new Error('address not found',{cause:404}))
    }

    if(data.isDefault === true)
    {
        await addressModel.updateMany(
            {userId,_id:{$ne:addressId}},
            {$set:{isDefault:false}}
        )
    }

    if(data.isDefault === false && address.isDefault)
    {
        const replacement = await addressModel.findOneAndUpdate(
            {userId,_id:{$ne:addressId}},
            {$set:{isDefault:true}},
            {returnDocument:'after',sort:{createdAt:1}}
        )

        if(!replacement)
        {
            return next(new Error('the only address must remain the default',{cause:400}))
        }
    }

    const updatedAddress = await addressModel.findOneAndUpdate(
        {_id:addressId,userId},
        {$set:data},
        {returnDocument:'after',runValidators:true}
    )

    return res.status(200).json({
        message:'address updated successfully',
        address:updatedAddress
    })
})

export const deleteAddress = asyncHandler(async(req,res,next)=>{
    const userId = req.user.id
    const address = await addressModel.findOneAndDelete({
        _id:req.params.addressId,
        userId
    })

    if(!address)
    {
        return next(new Error('address not found',{cause:404}))
    }

    if(address.isDefault)
    {
        await addressModel.findOneAndUpdate(
            {userId},
            {$set:{isDefault:true}},
            {returnDocument:'after',sort:{createdAt:1}}
        )
    }

    return res.status(200).json({message:'address deleted successfully'})
})
