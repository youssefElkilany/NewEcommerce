import mongoose, { Schema , Types, model } from "mongoose";


const orderSchema = new Schema({

    products:[{

        
            productId:{
            type:Types.ObjectId,
            ref:'Product',
            required:true
        },
        variantId:{
            type:Types.ObjectId,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        unitPrice:{
            type:Number,
            required:true,
        },
        paymentPrice:{
            type:Number,
            required:true
        },
       
        quantity:{
            type:Number,
            required:true
        }
    }],

    phone:[{type:String,required:true}],
    status:{type:String,default:'placed',enum:['waitingForPayment','onTheWay','cancelled','delivered','placed']},
    note:{type:String},
    couponId:{type:Types.ObjectId,ref:'Coupon'},
    subTotal:{type:Number,required:true},
    finalPrice:{type:Number,required:true},
    paymentMethod:{type:String,default:'Cash',enum:['Cash','Card']},
    reason:String,
    createdBy:{
        type:Types.ObjectId,
        ref:'User',
         required:true
    },
     shippingAddress: { // so if user changes address after ordering this address won't change
  name: String,
  phone: String,
  country: String,
  city: String,
  street: String,
  buildingNumber: String,
  floor: String,
  apartment: String,
  additionalInfo: String
}
},{
    timestamps:true,
})


const orderModel =  mongoose.models.Order || model('Order',orderSchema)
export default orderModel


// make empty schema for all models like user schema 
