import cartModel from "../../../../DB/Models/cart.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";

// check that product mawgood asln wla l2 
//lw product msh mawgood push
// lw product mawgood nzwd quantity
// lazm ykoon cart bta3t nafs user

export const addToCart = asyncHandler(async(req,res,next)=>{

    const {productId , variantId} = req.body
    const {quantity} = req.body

    const product = await productModel.findOne({_id:productId,'variants._id':variantId,isDeleted:false}).select('variants.$')
    if(!product)
    {
        return next(new Error("product not found"))
    }
    if(product.variants[0].stock < quantity )
    {
        return next(new Error(`only ${product.variants[0].stock} available in stock`))
    }

    const cart = await cartModel.findOne({createdBy:req.user.id})
    if(!cart)
    {
      await cartModel.create({createdBy:req.user.id})
         return next(new Error("cart not found"))
    }

    const currentCart = cart.products.find(product =>{
      return  String(product.productId) === productId && 
        String(product.variantId) === variantId
    })

    // if product already in cart increment quantity and check if stock is available
     if(product.variants[0].stock < quantity + Number(currentCart?.quantity) || 0 )
    {
        return next(new Error(`only ${product.variants[0].stock} available in stock`))
    }

    if(!currentCart)
    {
        cart.products.push({productId ,variantId , quantity})
    }
    else{
        currentCart.quantity = quantity + Number(currentCart.quantity)
    }
    await cart.save()

    return res.status(200).json({
    message: 'Product added to cart successfully',
    cart
  });

    // const cart = await cartModel.findOne({createdBy:req.user.id , 'products.productId':productId})
    // if(cart)
    // { // if product found in cart
    //     const incrementQuantity = await cartModel.updateOne({createdBy:req.user.id , 'products.productId':productId},{'products.$.quantity':quantity})
    //     if(incrementQuantity.modifiedCount === 0)
    //     {
    //         return next(new Error("nothing got updated"))
    //     }
    //     return res.json({message:"product added to cart successfully"})
    // }

    // const addProduct = await cartModel.findOneAndUpdate({createdBy:req.user.id , 'products.productId':productId},{$addToSet:{'products.productId':product,'products.quantity':quantity}})

    // return res.json({message:"product added to cart successfully",addProduct})

})


export const addToCartAlternative = asyncHandler(async (req, res, next) => {
  const { productId, variantId } = req.params;
  const quantity = Number(req.body.quantity ?? 1);

  const product = await productModel.findOne({
    _id: productId,
    'variants._id': variantId,
    isDeleted: false
  }).select('variants.$');

  if (!product) {
    return next(new Error('Product or variant not found', { cause: 404 }));
  }

  const variant = product.variants[0];

  // Your registration controller already creates the user's cart.
  const cart = await cartModel.findOne({
    createdBy: req.user.id
  });

  if (!cart) {
    return next(new Error('Cart not found', { cause: 404 }));
  }

  const existingItem = cart.products.find(item =>
    String(item.productId) === productId &&
    String(item.variantId) === variantId
  );

  const totalQuantity = (existingItem?.quantity ?? 0) + quantity;

  // Check the total already in the cart plus the new quantity.
  if (totalQuantity > variant.stock) {
    return next(new Error(
      `Only ${variant.stock} available; your cart would contain ${totalQuantity}`,
      { cause: 400 }
    ));
  }

  if (existingItem) {
    existingItem.quantity = totalQuantity;
  } else {
    cart.products.push({
      product: productId,
      variantId,
      quantity
    });
  }

  await cart.save();

  return res.status(200).json({
    message: 'Product added to cart successfully',
    cart
  });
});