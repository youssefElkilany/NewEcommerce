import { Router } from 'express'
import * as orderController from './Controller/order.js'
import Auth from '../../Middelware/auth.js'
const router = Router()

router.post('/',Auth(),orderController.createOrder)

export default router
