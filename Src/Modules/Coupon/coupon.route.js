import { Router } from 'express'
import * as couponController from './Controller/coupon.js'
import Auth from '../../Middelware/auth.js'
import { addCoupon } from './Controller/coupon.js'
import { validateCreateCoupon, validateUpdateCoupon, validateCouponId, validateCouponList } from './validation.js'
import { roles } from '../../Middelware/validation.js'

const router = Router()

router.get('/',Auth([roles.Admin,roles.Seller]),validateCouponList,couponController.getSellerCoupons)
router.post('/', Auth([roles.Admin , roles.Seller]), validateCreateCoupon, couponController.addCoupon)
router.put('/:couponId',Auth([roles.Admin , roles.Seller]),validateCouponId,validateUpdateCoupon,couponController.updateCoupon)
router.delete('/:couponId',Auth([roles.Admin , roles.Seller]),validateCouponId,couponController.deleteCoupon)
export default router
