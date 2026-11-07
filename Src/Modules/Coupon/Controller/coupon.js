import { asyncHandler } from "../../../Utills/errorHandler.js";
import couponModel from "../../../../DB/Models/coupon.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import categoryModel from "../../../../DB/Models/category.model.js";
import { createCouponSchema } from "../validation.js";

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
  const coupon = await couponModel.findOne({_id:req.params.couponId,createdBy:req.user.id});
  if(!coupon) return next(new Error('coupon not found',{cause:404}));

  const keys = Object.keys(createCouponSchema.describe().keys);
  const current = {};
  for(const key of keys) if(coupon[key] !== undefined) {
    current[key] = ['applicableProducts','excludedProducts','applicableCategories'].includes(key)
      ? coupon[key].map(id => String(id)) : coupon[key];
  }

  const merged = {...current,...req.body};

  if(merged.discountType === 'fixed') delete merged.maxDiscountAmount;

  const {error,value:data} = createCouponSchema.validate(merged,{abortEarly:false});
  if(error) return res.status(400).json({message:'Validation Error',validationErr:error.details});

  const duplicate = await couponModel.findOne({code:data.code,_id:{$ne:coupon._id}});
  if(duplicate) return next(new Error('Coupon code already exists',{cause:409}));

  if(data.usageLimit !== null && data.usageLimit < (coupon.usedBy?.length || 0))
    return next(new Error('Usage limit is lower than the number of existing uses',{cause:400}));

  if(data.applicableProducts.some(id => data.excludedProducts.includes(id)))
    return next(new Error('A product cannot be both applicable and excluded',{cause:400}));

  const productIds = [...new Set([...data.applicableProducts,...data.excludedProducts])];
  const [products,categories] = await Promise.all([
    productIds.length ? productModel.countDocuments({_id:{$in:productIds},isDeleted:false}) : 0,
    data.applicableCategories.length ? categoryModel.countDocuments({_id:{$in:data.applicableCategories}}) : 0
  ]);

  if(products !== productIds.length || categories !== data.applicableCategories.length)
    return next(new Error('One or more products or categories were not found',{cause:404}));

  const update = {$set:data};
  if(data.discountType === 'fixed') update.$unset = {maxDiscountAmount:1};
  const newCoupon = await couponModel.findOneAndUpdate({_id:coupon._id,createdBy:req.user.id},update,{returnDocument:'after',runValidators:true});
  return res.json({message:'updated successfully',newCoupon});
});

export const getSellerCoupons = asyncHandler(async(req,res)=>{
  const page=Number(req.query.page)||1, size=Number(req.query.size)||50;
  const results = await couponModel.find({createdBy:req.user.id}).sort({createdAt:-1}).skip((page-1)*size).limit(size+1).lean();
  const coupons = results.slice(0,size).map(({usedBy,...coupon})=>({...coupon,usedCount:usedBy?.length||0}));
  return res.json({coupons,pagination:{page,size,hasMore:results.length>size}});
});

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