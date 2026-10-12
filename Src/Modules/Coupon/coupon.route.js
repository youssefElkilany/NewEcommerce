import { Router } from 'express'
import * as couponController from './Controller/coupon.js'
import Auth from '../../Middelware/auth.js'
import { addCoupon } from './Controller/coupon.js'
import { validateCreateCoupon } from './validation.js'
import { roles } from '../../Middelware/validation.js'

const router = Router()

router.post('/', Auth([roles.Admin , roles.Seller]), validateCreateCoupon, couponController.addCoupon)
router.put('/:couponId',Auth([roles.Admin , roles.Seller]),couponController.updateCoupon)
router.delete('/:couponId',Auth([roles.Admin , roles.Seller]),couponController.deleteCoupon)
export default router
