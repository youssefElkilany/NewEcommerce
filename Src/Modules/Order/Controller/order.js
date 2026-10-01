
// idempotency-key to not make order twice to same customer 
// and race conditions
import couponModel from "../../../../DB/Models/coupon.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";
import cartModel from "../../../../DB/Models/cart.model.js";
import orderModel from "../../../../DB/Models/order.model.js";
import addressModel from "../../../../DB/Models/address.model.js";
import payment from "../../../Utills/Payment.js";
import Stripe from "stripe";
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
const shippingAddress = {}
     if(req.body.addressId) // hb2a a7oto abl product
    {
        const address = await addressModel.findOne({_id:req.body.addressId,userId:req.user.id})
        if(!address)
        {
            return next(new Error('address not found'))
        }
          shippingAddress.name = address.name,
         shippingAddress.phone = address.phone,
  shippingAddress.country = address.country,
  shippingAddress.city = address.city,
  shippingAddress.street = address.street,
  shippingAddress.buildingNumber = address.buildingNumber,
  shippingAddress.floor = address.floor,
  shippingAddress.apartment = address.apartment ?? undefined,
  shippingAddress.additionalInfo = address.additionalInfo ?? undefined
  data.shippingAddress = shippingAddress
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

        // products.name = product.name// ns2l lw 3ayzeen n3ml keda ehh ehy7sal
        
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
        // check maxDiscountAmount if discountValue is greater than maxDiscountAmount then maxDiscountAmount will be applied
        if(totalPrice * (data.coupon.discountValue / 100) > data.coupon.maxDiscountAmount)
        { 
            data.finalPrice= totalPrice - data.coupon.maxDiscountAmount
        }
        else{
            let discountAmount = totalPrice * (data.coupon.discountValue / 100)
            data.finalPrice= totalPrice - discountAmount
        }
    }
    else if(data.coupon?.discountType === 'fixed')
    {
        data.finalPrice= totalPrice - data.coupon.discountValue
    }
    else{
        data.finalPrice= totalPrice
    }

    data.createdBy = req.user.id
    data.phone = phone
    data.products = productArr
    data.note = req.body.note ?? undefined
    data.paymentMethod = req.body.paymentMethod ?? 'Cash'
    data.status = req.body.paymentMethod ? 'pendingPayment' :'placed'

    const order = await orderModel.create(data)

    
    // after creating order we decrease stock of products and add user to coupon and remove items from cart

    // update Stock
    for (const items of productArr) { // take it from products array that came from frontEnd
        
        
        
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

    if(req.body.paymentMethod === 'Card')
    {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        if(code)
        {
            if(data.coupon.discountType === 'percentage')
            {
                const coupon = await stripe.coupons.create({percent_off:data.coupon.discountValue,duration:'once'})
                data.stripeCouponId = coupon.id
            }
            else if(data.coupon.discountType === 'fixed')
            {
                const coupon = await stripe.coupons.create({amount_off:data.coupon.discountValue * 100,currency:'usd',duration:'once'})
                data.stripeCouponId = coupon.id
            }
        }
  const session =  await payment({
        stripe,
        customer_email:req.user.email,
        metadata:{
            orderId:order._id.toString()
    },
    cancel_url:`${process.env.STRIPE_CANCEL_URL}?orderId=${order._id.toString()}`,
    line_items:productArr.map(item=>{
        return {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name
                },
                unit_amount: item.paymentPrice * 100 // Stripe expects amount in cents
            },
            quantity: item.quantity,
            discounts: data.stripeCouponId ? [{coupon: data.stripeCouponId}] : []
        }
    })
})
 return res.json({message:"order created successfully",order,session})
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



export const webhook = asyncHandler(async (req, res) => {
  let event = req.body;
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.endpointSecret;
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }
  }
  
const {orderId} = event.data.object.metadata
  // Handle the event
  if(event.type !== 'checkout.session.completed') {
    // update status to rejected then elmfrood increment stock of products and remove user from coupon
    const updateOrder = await orderModel.updateOne({_id:orderId},{status:'rejected'})
    if(updateOrder.modifiedCount === 0)
    {
        return res.status(400).json({message:"something went wrong in updating order status"})
    }
    // increment stock of products
    for (const items of updateOrder.products) {
        await productModel.updateOne({_id:items.productId,'variants._id':items.variantId},{'variants.$.stock':{$inc:parseInt(items.quantity)}})
    }
    // remove user from coupon if coupon is used
    if(updateOrder?.couponId)
    {
        await couponModel.updateOne({_id:updateOrder.couponId},{$pull:{
            usedBy:updateOrder.createdBy
        }})
    }
  }

   const updateOrder = await orderModel.updateOne({_id:orderId},{status:'placed'})

  
  res.status(200).json({message:"order updated successfully"});
});