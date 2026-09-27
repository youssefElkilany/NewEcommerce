import brandModel from '../../../../DB/Models/brand.model.js'
import { asyncHandler } from '../../../Utills/errorHandler.js'
import cloudinary from '../../../Utills/Cloudinary.js'
import slugify from 'slugify'

export const addBrand = asyncHandler(async (req, res, next) => {
    const { name } = req.body
    const normalizedName = name.toLowerCase().trim()

    const brand = await brandModel.findOne({ normalizedName })
    if (brand) {
        return next(new Error('name already exist'))
    }

    if (!req.file) {
        return next(new Error('image is required'))
    }

    const { secure_url, public_id } = await cloudinary.uploader.upload(
        req.file.path,
        { folder: `${process.env.App}/brand` }
    )

    const createdBrand = await brandModel.create({
        name,
        normalizedName,
        slug: slugify(name),
        image: { secure_url, public_id },
        createdBy: req.user.id
    })

    return res.status(201).json({
        message: 'done',
        brand: createdBrand
    })
})

export const updateBrand = asyncHandler(async (req, res, next) => {
    const { brandId } = req.params
    const brand = await brandModel.findOne({_id:brandId, createdBy:req.user.id})

    if (!brand) {
        return next(new Error('brand not found'))
    }

    const data = {}

    if (req.body?.name) {
        const normalizedName = req.body.name.toLowerCase().trim()

        if (brand.name === req.body.name) {
            return next(new Error('same old name'))
        }

        const checkBrand = await brandModel.findOne({
            normalizedName,
            _id: { $ne: brandId }
        })
        if (checkBrand) {
            return next(new Error('name already exist'))
        }

        data.name = req.body.name
        data.normalizedName = normalizedName
        data.slug = slugify(req.body.name)
    }

    if (req.file) {
        const { secure_url, public_id } = await cloudinary.uploader.upload(
            req.file.path,
            { folder: `${process.env.App}/brand` }
        )

        data.image = { secure_url, public_id }
        await cloudinary.uploader.destroy(brand.image.public_id)
    }

    const updatedBrand = await brandModel.findOneAndUpdate(
        {_id:brandId, createdBy:req.user.id},
        data,
        { returnDocument: 'after', runValidators: true }
    )

    return res.json({
        message: 'done',
        brand: updatedBrand
    })
})

// need to be checked if brand is related to prdoucts
export const deleteBrand = asyncHandler(async(req,res,next)=>{
    const {brandId} = req.params
    const brand = await brandModel.findOneAndDelete({_id:brandId,createdBy:req.user.id})
    if(!brand)
    {

    }

    return res.json({message:"brand is deleted successfully"})

})