import { Router } from 'express'
import * as orderController from './Controller/order.js'
import Auth from '../../Middelware/auth.js'
import express from 'express'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
const router = Router()

router.post('/',Auth([roles.User]),validationn(schemas.createOrder),orderController.createOrder)
router.post('/webhook', express.raw({type: 'application/json'}), orderController.webhook)

export default router
