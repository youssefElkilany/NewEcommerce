import mongoose, { Schema , Types, model } from "mongoose";

//minOrderAmount -> order can't be less than this amount to apply coupon
//maxDiscountAmount -> can't make discount more than this value
//maxUsageLimit -> max uses for all users
//usageLimitPerUser -> default = 1

//discountType
//discountValue

// const couponSchema = new Schema({
   
//  numOfUses:{
//     type:Number,
//     min:0
//  },// how many users can use this coupon elyl7a2 or uses per user

//  code:{
//     type:String,
//     required:true,
//     unique:true,
//  },
//  discount:{

//  },

//  usedBy:[{
//     type:Types.ObjectId,
//     ref:"User"
//  }],

//  expireDate:{
//     type:Date
//  },

//  //QRCODE to scan code to get coupon details
   
//     createdBy:{
//         type:Types.ObjectId,
//         ref:'User',
//         unique:true
//         // required:true
//     }
// },{
//     timestamps:true,
// })

// code , discountType , discountValue , expireDate , createdBy , maxDiscountAmount , minOrderAmount , products or categories

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0
    },

    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null
    },

    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    expireDate: {
      type: Date,
      required: true
    },

    usageLimit: {
      type: Number,
      default: null
    },

    // usageLimitPerUser: { // we will make default use only 1
    //   type: Number,
    //   default: 1
    // },

    applicableProducts: [
      {
        type: Types.ObjectId,
        ref: "Product"
      }
    ],

    applicableCategories: [
      {
        type: Types.ObjectId,
        ref: "Category"
      }
    ],

    excludedProducts: [
      {
        type: Types.ObjectId,
        ref: "Product"
      }
    ],
    createdBy:{
          type:Types.ObjectId,
          ref:"User",
          required:true
    },

    usedBy:[{ // if we are going to make user use coupon more than 1 time add count field in usedBy
    type:Types.ObjectId,
    ref:"User"
 }],


    // isActive: {
    //   type: Boolean,
    //   default: true
    // }
  },
  {
    timestamps: true
  }
);

const couponModel =  mongoose.models.Coupon || model('Coupon',couponSchema)
export default couponModel

// empty applicableProducts and empty applicableCategories as meaning coupon applies to all products,
// while excludedProducts can still remove specific products from eligibility