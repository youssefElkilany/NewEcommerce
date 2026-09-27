import mongoose, { Schema , Types, model } from "mongoose";


const subCategorySchema = new Schema({
    name:{
        type:String,
        required:true
    },
     normalizedName:{
         type:String,
         unique:true,
         lowercase:true,
         required:true
    },
    slug:{
        type:String,
        required:true
    },
    image:{
        type:Object,
         required:true
    },
    cloudId:{
        type:String,
        unique:true
    },
     categoryId:{
        type:Types.ObjectId,
        ref:'Category',
        required:true
    },
    createdBy:{
        type:Types.ObjectId,
        ref:'User',
         required:true
    }
},{
    timestamps:true
})


const subCategoryModel =  mongoose.models.Subcategory || model('Subcategory',subCategorySchema)
export default subCategoryModel


// make empty schema for all models like user schema 
