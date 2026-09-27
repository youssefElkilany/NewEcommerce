import mongoose, { Schema , Types, model } from "mongoose";


const categorySchema = new Schema({
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
    createdBy:{
        type:Types.ObjectId,
        ref:'User',
         required:true
    }
},{
    timestamps:true,
    toJSON:{virtuals:true},// to let data appear in json
    toObject:{virtuals:true} // to let data appear in console
})

categorySchema.virtual('subcategory',{
    localField:'_id',
    ref:'Subcategory',
    foreignField:'categoryId'
})


const categoryModel =  mongoose.models.Category || model('Category',categorySchema)
export default categoryModel


// make empty schema for all models like user schema 
