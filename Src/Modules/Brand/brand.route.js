import { Router } from 'express'
import * as brandController from './Controller/brand.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'

const router = Router()

router.route('/')
    .get(brandController.getBrands)
    .post(Auth([roles.Seller]), fileUpload().single('image'), validationn(schemas.addBrand), brandController.addBrand)
    router.patch('/:brandId',Auth([roles.Seller]), fileUpload().single('image'), validationn(schemas.updateBrand), brandController.updateBrand)

export default router
