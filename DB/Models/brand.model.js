import mongoose, { Schema , Types, model } from "mongoose";


const brandSchema = new Schema({
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
    timestamps:true
})


const brandModel =  mongoose.models.Brand || model('Brand',brandSchema)
export default brandModel


// make empty schema for all models like user schema 
