import assert from 'node:assert/strict';
import test from 'node:test';
import couponModel from '../DB/Models/coupon.model.js';
import productModel from '../DB/Models/product.model.js';
import categoryModel from '../DB/Models/category.model.js';
import { addCoupon } from '../Src/Modules/Coupon/Controller/coupon.js';
import { createCouponSchema, validateCreateCoupon } from '../Src/Modules/Coupon/validation.js';
import router from '../Src/Modules/Coupon/coupon.route.js';

const userId = '507f1f77bcf86cd799439011';
const productId = '507f1f77bcf86cd799439012';
const categoryId = '507f1f77bcf86cd799439013';
const validBody = () => ({
  code: ' welcome10 ',
  discountType: 'percentage',
  discountValue: 10,
  expireDate: new Date(Date.now() + 86400000).toISOString()
});

test('validation normalizes codes and numeric values and applies defaults', () => {
  const { error, value } = createCouponSchema.validate({ ...validBody(), discountValue: '10' });
  assert.equal(error, undefined);
  assert.equal(value.code, 'WELCOME10');
  assert.equal(value.discountValue, 10);
  assert.ok(value.expireDate instanceof Date);
  assert.equal(value.minOrderAmount, 0);
  assert.equal(value.usageLimit, null);
  assert.equal(value.usageLimitPerUser, 1);
  assert.deepEqual(value.applicableProducts, []);
});

test('percentage permits 0..100; fixed requires a positive amount', () => {
  for (const discountValue of [0, 100]) {
    assert.equal(createCouponSchema.validate({ ...validBody(), discountValue }).error, undefined);
  }
  assert.equal(createCouponSchema.validate({
    ...validBody(), discountType: 'fixed', discountValue: 500
  }).error, undefined);
  for (const changes of [
    { discountValue: -1 }, { discountValue: 101 },
    { discountType: 'fixed', discountValue: 0 },
    { discountType: 'fixed', maxDiscountAmount: 10 },
    { discountType: 'unknown' }, { expireDate: '2000-01-01' },
    { usageLimit: 0 }, { usageLimitPerUser: 1.5 },
    { minOrderAmount: -1 }, { code: '   ' },
    { applicableProducts: ['invalid'] },
    { applicableProducts: [productId, productId] },
    { applicableProducts: ['ABCDEFABCDEFABCDEFABCDEF', 'abcdefabcdefabcdefabcdef'] },
    { createdBy: userId }, { usedBy: [userId] }
  ]) {
    assert.ok(createCouponSchema.validate({ ...validBody(), ...changes }).error);
  }
});

test('validation middleware keeps validated body and rejects invalid requests', () => {
  assert.ok(createCouponSchema.validate(undefined).error);
  const req = { body: validBody() };
  let continued = false;
  validateCreateCoupon(req, {}, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.body.code, 'WELCOME10');

  let status;
  const res = { status(code) { status = code; return this; }, json() {} };
  validateCreateCoupon({ body: { ...validBody(), discountValue: 101 } }, res,
    () => assert.fail('Invalid request must not continue'));
  assert.equal(status, 400);
});

async function invoke(changes = {}, mocks = {}, user = { _id: userId }) {
  const originals = [couponModel.findOne, couponModel.create,
    productModel.countDocuments, categoryModel.countDocuments];
  let created;
  couponModel.findOne = mocks.findOne ?? (async () => null);
  couponModel.create = mocks.create ?? (async data => { created = data; return data; });
  productModel.countDocuments = mocks.products ?? (async () => 0);
  categoryModel.countDocuments = mocks.categories ?? (async () => 0);
  const response = {};
  const res = {
    status(code) { response.status = code; return this; },
    json(body) { response.body = body; return this; }
  };
  try {
    const { error, value } = createCouponSchema.validate({ ...validBody(), ...changes });
    assert.equal(error, undefined);
    await addCoupon({ body: value, user }, res, error => { response.error = error; });
    return { ...response, created };
  } finally {
    [couponModel.findOne, couponModel.create,
      productModel.countDocuments, categoryModel.countDocuments] = originals;
  }
}

test('controller creates coupon with the authenticated owner and verified references', async () => {
  const response = await invoke({
    applicableProducts: [productId], applicableCategories: [categoryId]
  }, {
    findOne: async filter => { assert.deepEqual(filter, { code: 'WELCOME10' }); return null; },
    products: async filter => {
      assert.deepEqual(filter, { _id: { $in: [productId] }, isDeleted: false });
      return 1;
    },
    categories: async filter => {
      assert.deepEqual(filter, { _id: { $in: [categoryId] } });
      return 1;
    }
  });
  assert.equal(response.status, 201);
  assert.equal(response.created.createdBy, userId);
  assert.equal(response.created.code, 'WELCOME10');
  assert.equal(response.created.usedBy, undefined);
});

test('controller rejects duplicate codes including unique-index races', async () => {
  assert.equal((await invoke({}, { findOne: async () => ({}) })).error.cause, 409);
  assert.equal((await invoke({}, {
    create: async () => { throw Object.assign(new Error('Duplicate key'), { code: 11000 }); }
  })).error.cause, 409);
});

test('controller rejects overlapping and missing references without creating coupons', async () => {
  const overlap = await invoke({ applicableProducts: [productId], excludedProducts: [productId] });
  assert.equal(overlap.error.cause, 400);
  assert.equal(overlap.created, undefined);
  const missingProduct = await invoke({ excludedProducts: [productId] });
  assert.equal(missingProduct.error.cause, 404);
  assert.equal(missingProduct.created, undefined);
  const missingCategory = await invoke({ applicableCategories: [categoryId] });
  assert.equal(missingCategory.error.cause, 404);
  assert.equal(missingCategory.created, undefined);
});

test('controller requires authentication', async () => {
  const response = await invoke({}, {}, null);
  assert.equal(response.error.cause, 401);
  assert.equal(response.created, undefined);
});

test('POST route registers authentication, validation, and controller', () => {
  const route = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post);
  assert.ok(route);
  assert.equal(route.route.stack.length, 3);
  assert.equal(route.route.stack[1].handle, validateCreateCoupon);
  assert.equal(route.route.stack[2].handle, addCoupon);
});
