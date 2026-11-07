import {Router}  from 'express'
import * as userController from './Controller/user.js'
import Auth from '../../Middelware/auth.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
const router = Router()
const signedIn = Auth([roles.User, roles.Seller, roles.Admin])
router.get('/me', signedIn, userController.getProfile)
router.patch('/me', signedIn, validationn(schemas.updateProfile, ['body']), userController.updateProfile)



router.get('/wishlist',Auth([roles.User]),userController.getWishlist)
router.post('/wishlist',Auth([roles.User]) ,userController.addToWishlist)
router.delete('/wishlist',Auth([roles.User]) ,userController.removeFromWishlist)

export default router
