import { Router } from 'express'
import * as orderController from './Controller/order.js'
import Auth from '../../Middelware/auth.js'
import express from 'express'
const router = Router()

router.post('/',Auth(),orderController.createOrder)
router.post('/webhook', express.raw({type: 'application/json'},orderController.webhookEndpoint))

export default router
