import { Router } from 'express'
import * as categoryController from './Controller/category.js'
import subCategoryRouter from '../SubCategory/subCategory.route.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
const router = Router()


router.use('/:categoryId/subcategory',subCategoryRouter)
router.route('/')
// .post(fileUpload('category').fields([{name:"image",maxCount:1},{name:'CV',maxCount:1}]),
// categoryController.addCategory)
.get(categoryController.getCategory)
.post(Auth(),fileUpload().single('image'),categoryController.addCategory)
router.patch('/:categoryId',Auth(),fileUpload().single('image'),categoryController.updateCategory)

// .delete(categoryController.deleteCategory)


export default router
