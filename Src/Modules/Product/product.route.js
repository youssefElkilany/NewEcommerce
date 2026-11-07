import { Router } from 'express'
import * as productController from './Controller/product.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
import reviewRouter from '../Review/review.route.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'

const router = Router()

router.get('/mine',Auth([roles.Admin,roles.Seller]),validationn(schemas.sellerProducts, ['query']),productController.getSellerProducts)
router.use('/:productId/review',reviewRouter)

router.route('/')
.post(Auth([roles.Admin,roles.Seller]), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),validationn(schemas.addProduct),productController.addProduct)
.get(validationn(schemas.getProducts, ['query']) ,productController.getProducts)
router.put('/:productId',Auth([roles.Admin,roles.Seller]), fileUpload().fields([{name:'image',maxCount:1},{name:'subImages',maxCount:4}]),validationn(schemas.updateProduct),productController.updateProduct)
router.post('/:productId/variant',Auth([roles.Admin,roles.Seller]), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),validationn(schemas.addVariants),productController.addVariants)
router.get('/:productId/variant/:variantId',validationn(schemas.getProductVariant),productController.getProductVariant)
router.patch('/:productId/variant/:variantId',Auth([roles.Admin,roles.Seller]), fileUpload().fields([{name:'mainImage',maxCount:1 },{name:'subImages',maxCount:4}]),validationn(schemas.updateVariant),productController.updateVariant)
router.delete('/:productId/variant/:variantId',Auth([roles.Admin,roles.Seller]), validationn(schemas.deleteVariant),productController.deleteVariant)

router.get('/:subCategoryId/brand',productController.getrelatedBrands)
export default router
