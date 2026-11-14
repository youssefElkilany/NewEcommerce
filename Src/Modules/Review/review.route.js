import { Router } from 'express'
import * as reviewController from './Controller/review.js'
import Auth from '../../Middelware/auth.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as val from './validation.js'
const router = Router({mergeParams:true})

router.post("/",Auth([roles.User]),validationn(val.createReview,['body','params']),reviewController.reviewProduct)
router.put("/:reviewId",Auth([roles.User]),validationn(val.updateReview,['body','params']),reviewController.updateReview)

export default router
