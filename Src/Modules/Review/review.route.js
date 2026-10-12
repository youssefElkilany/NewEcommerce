import { Router } from 'express'
import * as reviewController from './Controller/review.js'
import Auth from '../../Middelware/auth.js'
import { roles } from '../../Middelware/validation.js'
const router = Router({mergeParams:true})

router.post("/",Auth([roles.User]),reviewController.reviewProduct)

export default router
