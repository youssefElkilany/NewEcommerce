import categoryModel from '../../../../DB/Models/category.model.js'
import subCategoryModel from '../../../../DB/Models/subCategory.model.js'
import { asyncHandler } from '../../../Utills/errorHandler.js'
import cloudinary from '../../../Utills/Cloudinary.js'
import slugify from 'slugify'
import { nanoid } from 'nanoid'

export const getSubCategories = asyncHandler(async (req,res,next)=>{
    const {categoryId} = req.params

    const subCategory = await subCategoryModel.find({categoryId})
    if(subCategory.length === 0)
    {
        return next(new Error("no sub-category found"))
    }

    return res.json({message:"done",subCategory})
})


export const addSubCategory = asyncHandler(async (req, res, next) => {
    const {categoryId} = req.params
    const { name } = req.body
    

    const category = await categoryModel.findById(categoryId)
    if (!category) {
        return next(new Error('category not found'))
    }

    const normalizedName = name.toLowerCase().trim()
    const subCategory = await subCategoryModel.findOne({ normalizedName })
    if (subCategory) {
        return next(new Error('name already exist'))
    }

    if (!req.file) {
        return next(new Error('image is required'))
    }

    const cloudId = nanoid()
    const { secure_url, public_id } = await cloudinary.uploader.upload(
        req.file.path,
        { folder: `${process.env.App}/category/${categoryId}/sub-category/${cloudId}` }
    )

    const createdSubCategory = await subCategoryModel.create({
        name,
        normalizedName,
        slug: slugify(name),
        image: { secure_url, public_id },
        cloudId,
        categoryId,
        createdBy: req.user.id
    })

    return res.status(201).json({
        message: 'done',
        subCategory: createdSubCategory
    })
})

export const updateSubCategory = asyncHandler(async (req, res, next) => {
    const { subCategoryId , categoryId } = req.params
    const subCategory = await subCategoryModel.findOne({
        _id:subCategoryId,
        categoryId,
        createdBy:req.user.id
    })

    if (!subCategory) {
        return next(new Error('sub-category not found'))
    }

    const data = {}

    if (req.body?.name) {
        const normalizedName = req.body.name.toLowerCase().trim()

        if (subCategory.name === req.body.name) {
            return next(new Error('same old name'))
        }

        const checkSubCategory = await subCategoryModel.findOne({
            normalizedName,
            _id: { $ne: subCategoryId }
        })
        if (checkSubCategory) {
            return next(new Error('name already exist'))
        }

        data.name = req.body.name
        data.normalizedName = normalizedName
        data.slug = slugify(req.body.name)
    }

    if (req.file) {

        const categoryId = data.categoryId || subCategory.categoryId
        const { secure_url, public_id } = await cloudinary.uploader.upload(
            req.file.path,
            { folder: `${process.env.App}/category/${categoryId}/sub-category/${subCategory.cloudId}` }
        )

        data.image = { secure_url, public_id }
        await cloudinary.uploader.destroy(subCategory.image.public_id)
    }

    const updatedSubCategory = await subCategoryModel.findOneAndUpdate(
        {_id:subCategoryId, createdBy:req.user.id},
        data,
        { returnDocument: 'after', runValidators: true }
    )

    return res.json({
        message: 'done',
        subCategory: updatedSubCategory
    })
})
