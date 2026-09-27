import { Router } from 'express'
import * as productController from './Controller/product.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
import reviewRouter from '../Review/review.route.js'

const router = Router()

router.use('/:productId/review',reviewRouter)

router.route('/')
.post(Auth(), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),productController.addProduct)

router.put('/:productId',Auth(), fileUpload().fields([{name:'image',maxCount:1},{name:'subImages',maxCount:4}]),productController.updateProduct)
router.post('/:productId/variant',Auth(), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),productController.addVariants)
router.get('/:productId/variant/:variantId',productController.getProductVariant)
router.patch('/:productId/variant/:variantId',Auth(), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),productController.updateVariant)
router.delete('/:productId/variant/:variantId',Auth(), productController.deleteVariant)
export default router
