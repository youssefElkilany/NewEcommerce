import mongoose, { Schema , Types, model } from "mongoose";


const cartSchema = new Schema({
   
   products:[{
    productId:{
        type:Types.ObjectId,
        ref:'Product',
        required:true,
    },
    variantId:{
        type:Types.ObjectId,
        required:true
    },
    quantity:{
        type:Number,
        required:true,
        default:1
    },
    _id:false
   }],
    
   
    createdBy:{
        type:Types.ObjectId,
        ref:'User',
        unique:true,
         required:true
    }
},{
    timestamps:true,
})


const cartModel =  mongoose.models.Cart || model('Cart',cartSchema)
export default cartModel


// make empty schema for all models like user schema 
