import { Router } from 'express'
import * as categoryController from './Controller/category.js'
import subCategoryRouter from '../SubCategory/subCategory.route.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
const router = Router()


router.use('/:categoryId/subcategory',subCategoryRouter)
router.route('/')
// .post(fileUpload('category').fields([{name:"image",maxCount:1},{name:'CV',maxCount:1}]),
// categoryController.addCategory)
.get(validationn(schemas.getCategory),categoryController.getCategory)
.post(Auth([roles.Seller]),fileUpload().single('image'),validationn(schemas.addCategory),categoryController.addCategory)
router.patch('/:categoryId',Auth([roles.Seller]),fileUpload().single('image'),validationn(schemas.updateCategory),categoryController.updateCategory)

// .delete(categoryController.deleteCategory)


export default router
