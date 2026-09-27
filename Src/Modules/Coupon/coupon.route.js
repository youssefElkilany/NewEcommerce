import { Router } from 'express'
import * as couponController from './Controller/coupon.js'
import Auth from '../../Middelware/auth.js'
import { addCoupon } from './Controller/coupon.js'
import { validateCreateCoupon } from './validation.js'

const router = Router()

router.post('/', Auth(), validateCreateCoupon, couponController.addCoupon)
router.put('/:couponId',Auth(),couponController.updateCoupon)
router.delete('/:couponId',Auth(),couponController.deleteCoupon)
export default router
