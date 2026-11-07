import productModel from "../../../../DB/Models/product.model.js";
import userModel from "../../../../DB/Models/user.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";



async function serializeWishlist(wishList = []) {
  const productIds = [...new Set(wishList.map((item) => String(item.productId)))];
  const products = await productModel.find({ _id: { $in: productIds }, isDeleted: false })
    .select('description slug specifications brandName ratings variants')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return wishList.flatMap((item) => {
    const product = byId.get(String(item.productId));
    const variant = product?.variants.find((entry) => String(entry._id) === String(item.variantId));
    return product && variant ? [{ ...product, variants: [variant] }] : [];
  });
}

export const getWishlist = asyncHandler(async (req, res, next) => {
  const user = await userModel.findById(req.user.id).select('whishList').lean();
  if (!user) return next(new Error('User not found', { cause: 404 }));
  const products = await serializeWishlist(user.whishList || []);
  return res.json({ products });
});


export const addToWishlist = asyncHandler(async (req, res,next) => {
    const { productId , variantId } = req.body;

    const product = await productModel.findOne({ _id: productId ,isDeleted:false,variants:{$elemMatch:{
        _id:variantId,
        isActive:true,
    }}}).select('_id')
    if(!product) return next(new Error('Product or variant not found', { cause: 404 }))

        const user = await userModel.findByIdAndUpdate(req.user.id, { $addToSet: { whishList: { productId, variantId } } },
            { returnDocument: 'after' }).select('whishList')
        if (!user) return next(new Error('User not found', { cause: 404 }))
        res.status(200).json({ message: 'Product added to wishlist', products: await serializeWishlist(user.whishList || []) })
})



export const removeFromWishlist = asyncHandler(async (req, res,next) => {
    const { productId , variantId } = req.body;

    const user = await userModel.findByIdAndUpdate(req.user.id, { $pull: { whishList: { productId, variantId } } }, { returnDocument: 'after' })
    if (!user) return next(new Error('User not found', { cause: 404 }))
    res.status(200).json({ message: 'Product removed from wishlist', products: await serializeWishlist(user.whishList || []) })

})


// Explicit public account fields: never serialize the full authenticated user.
const accountDetails = (user) => ({
  id: user._id, name: user.userName || '', email: user.email,
  phone: user.phoneNo || '', role: user.role,
  emailVerified: !!user.confirmEmail, joinedAt: user.createdAt
});
export const getProfile = asyncHandler(async (req, res) => {
  return res.json({ user: accountDetails(req.user) });
});
export const updateProfile = asyncHandler(async (req, res, next) => {
  const fields = {};
  if (Object.hasOwn(req.body, 'name')) fields.userName = req.body.name;
  if (Object.hasOwn(req.body, 'phone')) fields.phoneNo = req.body.phone;
  const user = await userModel.findByIdAndUpdate(req.user.id, { $set: fields }, { returnDocument: 'after', runValidators: true })
    .select('userName email phoneNo role confirmEmail createdAt');
  if (!user) return next(new Error('User not found', { cause: 404 }));
  return res.json({ message: 'Account details updated', user: accountDetails(user) });
});
