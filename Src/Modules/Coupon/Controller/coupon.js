import { asyncHandler } from "../../../Utills/errorHandler.js";
import couponModel from "../../../../DB/Models/coupon.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import categoryModel from "../../../../DB/Models/category.model.js";

// applicable products or categories
export const addCoupon = asyncHandler(async(req,res,next)=>{
    const {
        code, discountType, discountValue, expireDate,
        maxDiscountAmount, minOrderAmount, usageLimitPerUser, usageLimit,
        applicableProducts, applicableCategories, excludedProducts
    } = req.body;

    const existingCoupon = await couponModel.findOne({code});
    if(existingCoupon)
    {
        return next(new Error('Coupon code already exists', {cause:409}));
    }

    if(applicableProducts?.some(id => excludedProducts?.includes(id)))
    {
        return next(new Error('A product cannot be both applicable and excluded', {cause:400}));
    }

    const productIds = [...new Set([...applicableProducts, ...excludedProducts])];
    const [productCount, categoryCount] = await Promise.all([
        productIds.length
            ? productModel.countDocuments({_id:{$in:productIds}, isDeleted:false})
            : 0,
        applicableCategories.length
            ? categoryModel.countDocuments({_id:{$in:applicableCategories}})
            : 0
    ]);

    if(productCount !== productIds.length)
    {
        return next(new Error('One or more products were not found', {cause:404}));
    }
    if(categoryCount !== applicableCategories.length)
    {
        return next(new Error('One or more categories were not found', {cause:404}));
    }

    try { // m7taga tt3dl
        const coupon = await couponModel.create({
            code, discountType, discountValue, expireDate,
            maxDiscountAmount, minOrderAmount, usageLimitPerUser, usageLimit,
            applicableProducts, applicableCategories, excludedProducts,
            createdBy:req.user.id
        });

        return res.status(201).json({
            message:'Coupon created successfully',
            coupon
        });
    } catch(error) {
        // The unique index also protects against simultaneous requests.
        if(error.code === 11000)
        {
            return next(new Error('Coupon code already exists', {cause:409}));
        }
        throw error;
    }
})


export const updateCoupon = asyncHandler(async(req,res,next)=>{
    const {couponId} = req.params
    const data = {}

    const coupon = await couponModel.findById(couponId)
    if(!coupon)
    {
        return next(new Error("coupon not found"))
    }

    if(req.body.code)
    {
        const checkCoupon = await couponModel.findOne({code:req.body.code.toUpperCase()})
        if(checkCoupon)
        {
            return next(new Error("Coupon already exist"))
        }
        data.code = req.body.code
    }
    if(req.body.usageLimit)
    {
        if(coupon.usedBy?.length > req.body.usageLimit)
        {
            return next(new Error("coupon already used by users more than limit"))
        }
        data.usageLimit = req.body.usageLimit   
    }
    if(req.body.usageLimitPerUser)
    {
        data.usageLimitPerUser = req.body.usageLimitPerUser
    }
    if(req.body.discountType)
    {
        data.discountType = req.body.discountType
    }
    if(req.body.discountValue)
    {
        data.discountValue = req.body.discountValue
    }
    if(req.body.expireDate)
    {
        data.expireDate = req.body.expireDate
    }
    if(req.body.maxDiscountAmount)
    {
        data.maxDiscountAmount = req.body.maxDiscountAmount
    }
    if(req.body.minOrderAmount)
    {
        data.minOrderAmount = req.body.minOrderAmount
    }


     // =========================
  // Arrays
  // =========================


  const applicableProducts =
    req.body.applicableProducts !== undefined
      ? req.body.applicableProducts
      : coupon.applicableProducts;

  const excludedProducts =
    req.body.excludedProducts !== undefined
      ? req.body.excludedProducts
      : coupon.excludedProducts;

  const applicableCategories =
    req.body.applicableCategories !== undefined
      ? req.body.applicableCategories
      : undefined

  // Check overlap between final applicable/excluded state
  const excludedSet = new Set(
    excludedProducts.map(id => id.toString())
  );

   if(applicableProducts?.some(id => excludedSet?.has(id.toString())))   
    {
        return next(new Error('A product cannot be both applicable and excluded', {cause:400}));
    }

  if(req.body.applicableProducts || req.body.excludedProducts)
  {
    const productIds = [...new Set([...applicableProducts , ...excludedProducts])]
    const productCount = await productModel.countDocuments({_id:{$in:productIds},isDeleted:false})

    if(productCount !== productIds.length)
    {
        return next(new Error('One or more products were not found', {cause:404}));
    }

     if(req.body.applicableProducts)
        {
            data.applicableProducts = req.body.applicableProducts
        }
        if(req.body.excludedProducts)
        {
            data.excludedProducts = req.body.excludedProducts
        }
  }
    
    const  categoryCount = applicableCategories.length
            ? await categoryModel.countDocuments({_id:{$in:applicableCategories}})
            : 0
    // must check category

   if (req.body.applicableCategories !== undefined) {
  if (categoryCount !== req.body.applicableCategories.length) {
    return next(
      new Error('One or more categories were not found', { cause: 404 })
    )
  }

  data.applicableCategories = req.body.applicableCategories;
}

const newCoupon = await couponModel.findOneAndUpdate({_id:couponId,createdBy:req.user.id},{$set:{data}},{returnDocument:'after'})

return res.json({message:"updated successfully",newCoupon})
})
// rewrite array , 2 api's for array , push and pull together in same array

export const deleteCoupon = asyncHandler(async(req,res,next)=>{
    const {couponId} = req.params

    const coupon = await couponModel.findOneAndDelete({_id:couponId, createdBy:req.user.id})
    if(!coupon)
    {
        return next(new Error("coupon not found"))
    }

    return res.json({message:"coupon deleted successfully"})
})



// arrays -> small array
//  -> 1- front-end send whole array and user can edit array
// ->  2- 1 API user can push or pull from array
// ->  3- 2 API's for each push and pull from array