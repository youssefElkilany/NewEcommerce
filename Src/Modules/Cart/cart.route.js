import { Router } from 'express';
import * as cartController from './Controller/cart.js';
import * as schemas from './validation.js';
import Auth from '../../Middelware/auth.js';
import { roles, validationn } from '../../Middelware/validation.js';

const router = Router();
const customer = Auth([roles.User]);
router.get('/', customer, cartController.getCart);
router.post('/', customer, validationn(schemas.addToCart, ['body']), cartController.addToCart);
router.patch('/', customer, validationn(schemas.updateCartItem, ['body']), cartController.updateCartItem);
router.delete('/:productId/:variantId', customer, validationn(schemas.cartItemParams, ['params']), cartController.removeCartItem);
export default router;
