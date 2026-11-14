import { Router } from 'express'
import * as orderController from './Controller/order.js'
import Auth from '../../Middelware/auth.js'
import express from 'express'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
import * as checkout2 from './Controller/checkout2.js'
const router = Router()
router.get('/mine',Auth([roles.User]),validationn(schemas.myOrders,['query']),orderController.getMyOrders)

// router.post('/',Auth([roles.User]),validationn(schemas.createOrder),orderController.createOrder)
//router.post('/webhook', express.raw({type: 'application/json'}), orderController.webhook)
// router.post('/checkout', Auth([roles.User]), validationn(schemas.transactionalCheckout, ['body']), checkoutController.checkout)
// //router.post('/checkout/webhook', express.raw({type: 'application/json'}), checkoutController.checkoutWebhook)
// router.post('/checkout/:orderId/reconcile', Auth([roles.User]), validationn(schemas.reconcileCheckout, ['body', 'params']), checkoutController.reconcile)

router.post('/checkout2', Auth([roles.User]), schemas.validateCheckoutKey, validationn(schemas.checkout2Create, ['body']), checkout2.createOrder)
router.post('/webhook', express.raw({ type: 'application/json', limit:'1mb' }), schemas.validateCheckoutWebhook, checkout2.checkoutWebhook)
router.post('/checkout2/:orderId/payment', Auth([roles.User]), validationn(schemas.orderPayment, ['body', 'params']), checkout2.payment)
router.post('/checkout2/:orderId/reconcile', Auth([roles.User]), validationn(schemas.checkout2Reconcile, ['body', 'params']), checkout2.reconcile)

export default router
