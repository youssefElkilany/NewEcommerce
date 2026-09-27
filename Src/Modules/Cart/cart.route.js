import { Router } from 'express'
import * as cartController from './Controller/cart.js'
import Auth from '../../Middelware/auth.js'

const router = Router()
router.post('/',Auth(),cartController.addToCart)
export default router
