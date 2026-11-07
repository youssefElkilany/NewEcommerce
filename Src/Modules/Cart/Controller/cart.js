import cartModel from "../../../../DB/Models/cart.model.js";
import productModel from "../../../../DB/Models/product.model.js";
import { asyncHandler } from "../../../Utills/errorHandler.js";

const itemKey = (item) => `${item.productId}:${item.variantId}`;

async function serializeCart(cart) {
  if (!cart) return { items: [], itemCount: 0, subtotal: 0 };
  const productIds = [...new Set(cart.products.map((item) => String(item.productId)))];
  const products = await productModel.find({ _id: { $in: productIds }, isDeleted: false })
    .select('description brandName variants')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items = cart.products.flatMap((item) => {
    const product = byId.get(String(item.productId));
    const variant = product?.variants.find((entry) => String(entry._id) === String(item.variantId));
    if (!product || !variant) return [];
    return [{
      productId: String(product._id), variantId: String(variant._id), quantity: item.quantity,
      name: variant.name, brandName: product.brandName, description: product.description,
      options: variant.options instanceof Map ? Object.fromEntries(variant.options) : variant.options || {},
      image: variant.mainImage?.secure_url || variant.mainImage?.url || '',
      price: variant.price, finalPrice: variant.finalPrice, discount: variant.discount || 0,
      stock: variant.stock || 0, lineTotal: variant.finalPrice * item.quantity
    }];
  });
  return { items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartModel.findOne({ createdBy: req.user.id }).lean();
  return res.json({ cart: await serializeCart(cart) });
});

export const addToCartCodex = asyncHandler(async (req, res, next) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const product = await productModel.findOne({ _id: productId, isDeleted: false, 'variants._id': variantId }).select('variants.$');
  const variant = product?.variants[0];
  if (!variant || variant.isActive === false) return next(new Error('Product or variant not found', { cause: 404 }));
  const cart = await cartModel.findOne({ createdBy: req.user.id }) || new cartModel({ createdBy: req.user.id, products: [] });
  const existing = cart.products.find((entry) => itemKey(entry) === `${productId}:${variantId}`);
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > variant.stock) return next(new Error(`Only ${variant.stock} available in stock`, { cause: 400 }));
  if (existing) existing.quantity = nextQuantity;
  else cart.products.push({ productId, variantId, quantity });
  await cart.save();
  return res.status(200).json({ message: 'Product added to cart.', cart: await serializeCart(cart.toObject()) });
});

// This follows the original cart flow: find the cart, find the matching product+variant,
// then add a new item or increment its quantity after checking available stock.
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const product = await productModel.findOne({
    _id: productId,
    'variants._id': variantId,
    isDeleted: false
  }).select('variants.$');

  if (!product || product.variants[0]?.isActive === false) {
    return next(new Error('Product or variant not found', { cause: 404 }));
  }

  const variant = product.variants[0];
  if(variant.stock === 0) {
    return next(new Error('Product is out of stock', { cause: 400 }));
  }
  if (quantity > variant.stock) {
    return next(new Error(`Only ${variant.stock} available in stock`, { cause: 400 }));
  }

  const cart = await cartModel.findOne({ createdBy: req.user.id });

  if (!cart) {
    const newCart = await cartModel.create({
      createdBy: req.user.id,
      products: [{ productId, variantId, quantity }]
    });
    return res.status(200).json({
      message: 'Product added to cart.',
      cart: await serializeCart(newCart.toObject())
    });
  }

  const currentCartItem = cart.products.find((item) =>
    String(item.productId) === String(productId) &&
    String(item.variantId) === String(variantId)
  );
  const requestedTotal = quantity + (currentCartItem?.quantity || 0);

  if (requestedTotal > variant.stock) {
    return next(new Error(`Only ${variant.stock} available in stock`, { cause: 400 }));
  }

  if (currentCartItem) currentCartItem.quantity = requestedTotal;
  else cart.products.push({ productId, variantId, quantity });

  await cart.save();
  return res.status(200).json({
    message: 'Product added to cart.',
    cart: await serializeCart(cart.toObject())
  });
});

// it sets quantity to the requested value, not incrementing it.
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId, variantId, quantity } = req.body;
  const product = await productModel.findOne({ _id: productId, isDeleted: false, 'variants._id': variantId }).select('variants.$');
  const variant = product?.variants[0];
  if (!variant || variant.isActive === false) return next(new Error('Product or variant not found', { cause: 404 }));

  if (quantity > variant.stock) return next(new Error(`Only ${variant.stock} available in stock`, { cause: 400 }));

  const cart = await cartModel.findOne({ createdBy: req.user.id });
  const item = cart?.products?.find((item) =>
    String(item.productId) === String(productId) &&
    String(item.variantId) === String(variantId)
  );
  if (!item) return next(new Error('Cart item not found', { cause: 404 }));
  item.quantity = quantity;
  await cart.save();
  return res.json({ cart: await serializeCart(cart.toObject()) });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  const cart = await cartModel.findOneAndUpdate(
    { createdBy: req.user.id },
    { $pull: { products: { productId, variantId } } },
    { returnDocument: 'after' }
  ).lean();
  return res.json({ cart: await serializeCart(cart) });
});

// Cart is made by optimistic update at frontend