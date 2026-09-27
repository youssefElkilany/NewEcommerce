import mongoose, { Types } from "mongoose";
import orderModel from "../../../../DB/Models/order.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import reviewModel from "../../../../DB/Models/review.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";

async function calculateAvgAndUpdateProduct(productId){

    const stats = await reviewModel.aggregate([{
        $match:{
            productId:new Types.ObjectId(productId)
        },
    },
    {
        $group:{
            _id:'$productId',
            average:{$avg:'$rating'},
            count:{$sum:1}
        }
    }
])

console.log({stats});

console.log({avg:stats[0]?.average});
console.log({count:stats[0]?.count});
console.log({avg2:stats[0]?.average??0});





const updateproduct = await productModel.findOneAndUpdate({_id:productId},{
    'ratings.average':stats[0]?.average ?? 0,
    'ratings.count':stats[0]?.count ?? 0
},{'returnDocument':"after"})

return updateproduct
}


export const reviewProduct = asyncHandler(async(req,res,next)=>{
    const {productId} = req.params
    const {orderId,rating,comment} = req.body
    console.log({productId});
    

    const product = await productModel.findById(productId)
    if(!product)
    {
        return next(new Error("product not found"))
    }
console.log("g");

    const order = await orderModel.findOne({_id:orderId,status:'delivered',
        'products.productId':productId,createdBy:req.user.id})
    if(!order)
    {
        return next(new Error("order not found"))
    }
console.log("zz");

    const review  = await reviewModel.findOne({productId , createdBy:req.user.id})
    if(review)
    {
       return next(new Error("you already reviewed before"))
    }
    // add review 
// update product
console.log("gg");


    const updateReview = await reviewModel.create({orderId , productId , createdBy:req.user.id,rating ,comment})
console.log("ggg");


    const updatedProduct = await calculateAvgAndUpdateProduct(productId)

    console.log("gggg");
    

    return res.json({message:"review completed",updatedProduct})
})


export const updateReview = asyncHandler(async(req,res,next)=>{

    const {reviewId} = req.params
    const data = {}
     data.rating = req.body.rating !== undefined ?  req.body.rating : undefined
     data.comment = req.body.comment !== undefined ? req.body.comment : undefined

     const review = await reviewModel.findOneAndUpdate({_id:reviewId,createdBy:req.user.id},{$set:data},{ returnDocument: 'after', runValidators: true })
    //  update product
  const updatedProduct = await calculateAvgAndUpdateProduct(review.productId)
     return res.json({message:"updated successfully",updatedProduct})
})


// runvalidators check need to search about it 