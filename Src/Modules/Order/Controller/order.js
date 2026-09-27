
// idempotency-key to not make order twice to same customer 
// and race conditions

import mongoose from "mongoose";
import couponModel from "../../../../DB/Models/coupon.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";
import cartModel from "../../../../DB/Models/cart.model.js";
import orderModel from "../../../../DB/Models/order.model.js";
import addressModel from "../../../../DB/Models/address.model.js";

// check coupon -> 
// 1- code 
// 2- expireDate 
// 3- usage 
// 4- maxDiscountAmount if coupon in percentage to minus from total order
// 5- minAmountOrder -> need to calculate total amount of products first
// 6- applicable products and excluded products , categories
// 7- update coupon usedBy -> add user to array

// check products first then check minAmountOrder for price

export const createOrder = asyncHandler(async(req,res,next)=>{

    const {code  , phone} = req.body
    let {products} = req.body

    if(!products)
    {
        const cart = await cartModel.findOne({createdBy:req.user.id})
        if(cart?.products?.length === 0)
        {
            return next(new Error("cart is empty"))
        }
        // products.isCart = true
        products = cart.products
         products.isCart = true
    }
    

    const data = {}
    if(code)
    {
        const coupon = await couponModel.findOne({code:code.toUpperCase(),expireDate:{$gt:Date.now()}})
    if(!coupon)
    {
        return next(new Error('coupon not found or expired'))
    }
    if(coupon.usedBy.includes(req.user.id)) // lw coupon min usage 1
    {
        return next(new Error('user already uses this coupon before'))
    }
    data.coupon = coupon
    }

     if(req.body.addressId) // hb2a a7oto abl product
    {
        const address = await addressModel.findOne({_id:req.body.addressId,userId:req.user.id})
        if(!address)
        {
            return next(new Error('address not found'))
        }
         data.shippingAddress.name = address.name,
         data.phone = address.phone,
  data.shippingAddress.country = address.country,
  data.shippingAddress.city = address.city,
  data.shippingAddress.street = address.street,
  data.shippingAddress.buildingNumber = address.buildingNumber,
  data.shippingAddress.floor = address.floor,
  data.shippingAddress.apartment = address.apartment ?? undefined,
  data.shippingAddress.additionalInfo = address.additionalInfo ?? undefined
    }
    else{
        // user enters new Address data
    }

    // product galy mrteen aw variants ygeely mrteen

     const currentProducts = products.map(item => String(item.productId))
    const currentVariants = products.map(item => String(item.variantId))
     const productSet = [...new Set([...currentProducts])]
    const variantSet = [...new Set([...currentVariants])]

    if(currentVariants.length !== variantSet.length)
    {
        return next(new Error("duplicate variants found"))
    }

    const applicableProducts = data.coupon?.applicableProducts
    const applicableCategories = data.coupon?.applicableCategories
    const excludedProducts = data.coupon?.excludedProducts
    
    // both empty means all products are applicable then we need to check excluded products
     if(applicableProducts?.length > 0 || applicableCategories?.length > 0)
    {
        
        // will make it later
        if(applicableCategories?.includes())
        {

        } // if products is not applicable across coupon it will abort 
        else if(productSet?.every(product => applicableProducts?.includes(String(product))))
        {
            return next(new Error("coupon is not validddddddddddd1111 on one of the products"))
        }
        // else if(!["1","2","3"].every(product => ["2","1","3","4","5"].includes(product)))
        // {
        //     return next(new Error("coupon is not validddddddddddd on one of the products"))
        // }
        //coupon mmkn y3ml 5asm 3la products menhom w yseeb ba2y products ?
    }
    
    
      if(productSet?.some(product => excludedProducts?.includes(String(product))))
        {
            return next(new Error("coupon is not validddddddddddd111122222 on one of the products"))
        }
    
    
    
    // old Code -------------  ------
    // const checkProducts = await productModel.find({_id:productSet,'variants._id':variantSet}).select('variants.$ ')
    // if(checkProducts.length <= 0)
    // {
    //     return next(new Error('one of the products is not found or its stock is not available '))
    // }

    const productArr = []
    let totalPrice = 0

    for (let item of products) {
        
        const product = await productModel.findOne({_id:item.productId,'variants._id':item.variantId ,isDeleted:false}).select('variants.$ name')
        if(!product)
        {
            return next(new Error("one of the products is not found"))
        }
        // item = item.toObject()

        products.name = product.name// ns2l lw 3ayzeen n3ml keda ehh ehy7sal
        
        if(product.variants[0].stock < item.quantity)
        {
            return next(new Error(`only ${product.variants[0].stock} available in stock`))
        }


        productArr.push({
            
                productId:item.productId,
                variantId:item.variantId,
                name:product.name,
                unitPrice:product.variants[0].price,
                paymentPrice:product.variants[0].finalPrice,
                quantity:item.quantity
        })

        totalPrice += (Number(item.quantity) * Number(product.variants[0].finalPrice))
        
        // applicable products and categories
        // delete items from cart
        
    }
    data.subTotal = totalPrice
 
    // check coupon // update usedBy of coupon with user after creating order
    if(data.coupon?.minOrderAmount > totalPrice)
    {
        return next(new Error(`order must begin from ${data.coupon?.minOrderAmount} `))
    }
    if(data.coupon?.discountType === 'percentage')
    {
        if(totalPrice * (data.coupon.discountValue / 100) > data.coupon.maxDiscountAmount)
        {
            
            
            data.finalPrice= totalPrice - data.coupon.maxDiscountAmount
        }
        else{
            data.finalPrice= totalPrice - data.coupon.discountValue
        }
    }

    data.createdBy = req.user.id
    data.phone = phone
    data.products = productArr
    data.note = req.body.note ?? undefined

    const order = await orderModel.create(data)

    
    // after creating order we decrease stock of products and add user to coupon and remove items from cart

    // update Stock
    for (const items of products) { // take it from products array that came from frontEnd
        
        
        
        // const updateStock = await productModel.updateOne({_id:items._id,'variants._id':items.variantId,'variants.stock':{$gte:items.quantity}},
        //     {$inc:{'variants.$.stock':- items.quantity}})
         const updateStock = await productModel.updateOne(
        {
            _id: items.productId,
            variants: {
                $elemMatch: {
                    _id: items.variantId,
                    stock: { $gte: items.quantity }
                }
            }
        },
        {
            $inc: {
                "variants.$.stock": -items.quantity
            }
        }
    );

            if(updateStock.modifiedCount === 0)
            {
                return next(new Error(`something went wrong in updating stock of that product ${items.name}`))// something wrong in updating stock
            }


             if(products?.isCart)
    {
        await cartModel.updateOne({createdBy:req.user.id // 3ayzeen ngrb wa7da kman ykoon feeha aktr mn product fel cart
    },{
       products:[]
    }) 
    }else{
        await cartModel.updateOne({createdBy:req.user.id // 3ayzeen ngrb wa7da kman ykoon feeha aktr mn product fel cart
    },{
        $pull:{
            products:{
                productId:items.productId,
                variantId:items.variantId
            }
        }
    }) 
    }
    }

    if(code)// add user to usedBy array
    {
        const coupon = await couponModel.updateOne({code},{$addToSet:{usedBy:req.user.id}})
    }


    // payment + phone
    return res.json({message:"order created successfully",order})

})

// we need to check if same product or same variants enters twice
// how things are calculated before pressing checkout coupon and total price 
// is that from cart or from frontEnd
// is updating stock and coupon need to be after creating order 


export const cancelOrder = asyncHandler(async(req,res,next)=>{
    const {orderId} = req.params

    const order = await orderModel.findOne({_id:orderId,createdBy:req.user.id})
    if(!order)
    {
        return next(new Error("order not found"))
    }
    if(order.status === 'onTheWay' || order.status === 'cancelled' || order.status === 'delivered')//['waitingForPayment','onTheWay','cancelled','delivered','placed']
    {
        return next(new Error("order can't be cancelled"))
    }
    if(order.status === 'placed')
    {
        for (const items of order.products) {
            await productModel.updateOne({_id:items.productId,'variants._id':items.variantId},{'variants.$.stock':{$inc:parseInt(items.quantity)}})
        }
    }
    if(order.couponId)
    {
        await couponModel.updateOne({_id:order.couponId},{$pull:{
            usedBy:req.user.id
        }})
    }
    // coupon

    // update order status
    await orderModel.updateOne({_id:orderId,createdBy:req.user.id},{status:'cancelled'})


    return res.json({message:"order cancelled"})

})