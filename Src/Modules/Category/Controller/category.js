import categoryModel from '../../../../DB/Models/category.model.js'
import {asyncHandler} from '../../../Utills/errorHandler.js'
import cloudinary from '../../../Utills/Cloudinary.js'
import slugify from "slugify"
import ApiFeatures from '../../../Utills/ApiFeatures.js'

export const getCategory = asyncHandler(async(req,res,next)=>{
    // no search
    const apiFeature = new ApiFeatures(categoryModel.find(),req.query).filter().sort().paginate().select()
    const category = await apiFeature.mongooseQuery
    if(category.length === 0)
    {
        return next(new Error("no categories yet"))
    }
    return res.json({message:"done",category})
})


export const addCategory = asyncHandler(async(req,res,next)=>{
    const {name} = req.body
    const slug = slugify(name)
    

    const category = await categoryModel.findOne({normalizedName:name.toLowerCase()})
    if(category)
    {
        return next(new Error("name already exist"))
    }

     const {secure_url , public_id} = await cloudinary.uploader.upload(req.file.path,{folder:`${process.env.App}/category`})

      const createCategory = await categoryModel.create({name,normalizedName:name.toLowerCase() , slug , image:{secure_url , public_id},createdBy:req.user.id})

    return res.json({message:"done",category:createCategory})
})



export const updateCategory = asyncHandler(async(req,res,next)=>{

    const {categoryId} = req.params
    let data = {}
    const category = await categoryModel.findOne({_id:categoryId,createdBy:req.user.id})
        if(!category)
        {
            return next(new Error("category not found"))
        }

    if(req.body?.name)
    {
        if(category.name === req.body.name)
        {
            return next(new Error("same old name"))
// name already exist or same old name
        }
        const checkCat = await categoryModel.findOne({normalizedName:req.body.name.toLowerCase().trim(),createdBy:req.user.id,_id:{$ne:categoryId}})
        if(checkCat)
        {
             return next(new Error("name already exist"))
        }
        data.name = req.body.name
        data.slug = slugify(req.body.name)
        data.normalizedName = req.body.name.toLowerCase()
    }

    if(req.file?.image)
    {
       
        const {secure_url , public_id} = await cloudinary.uploader.upload(req.file.path,{folder:`${process.env.App}/category`})
        data.image = {secure_url , public_id}
        await cloudinary.uploader.destroy(category.image.public_id)
    }

     const updateCat = await categoryModel.findOneAndUpdate({_id:categoryId,createdBy:req.user.id},data,{returnDocument:'after'})
    // const updateCat = await categoryModel.findByIdAndUpdate({_id:id,createdBy:req.user._id},data,{returnDocument:true})

    return res.json({message:"done",updateCat})


})


export const deleteCategory = asyncHandler(async(req,res,next)=>{
    const {id} = req.query
     const category = await categoryModel.findOne({_id:id,createdBy:req.user.id})
        if(!category)
        {
            return next(new Error("category not found"))
        }

        // const delCategory = await categoryModel.findOneAndDelete({_id:id,createdBy:req.user._id})
})// elmfrood lw hy3ml delete l category y3ml delete l kol elt7teeh ??????