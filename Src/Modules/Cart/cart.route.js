import { Router } from 'express'
import * as cartController from './Controller/cart.js'
import Auth from '../../Middelware/auth.js'
import { roles } from '../../Middelware/validation.js'

const router = Router()
router.post('/',Auth([roles.User]),cartController.addToCart)
export default router
