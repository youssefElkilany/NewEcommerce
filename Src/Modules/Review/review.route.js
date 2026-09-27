import { Router } from 'express'
import * as reviewController from './Controller/review.js'
import Auth from '../../Middelware/auth.js'
const router = Router({mergeParams:true})

router.post("/",Auth(),reviewController.reviewProduct)

export default router
