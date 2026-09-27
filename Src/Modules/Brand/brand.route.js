import { Router } from 'express'
import * as brandController from './Controller/brand.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'

const router = Router()

router.route('/')
    .post(Auth(), fileUpload().single('image'), brandController.addBrand)
    router.patch('/:brandId',Auth(), fileUpload().single('image'), brandController.updateBrand)

export default router
