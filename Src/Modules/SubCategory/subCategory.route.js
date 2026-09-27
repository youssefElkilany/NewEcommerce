import { Router } from 'express'
import * as subCategoryController from './Controller/subCategory.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
const router = Router({mergeParams:true})

router.route('/')
    .post(Auth(), fileUpload().single('image'), subCategoryController.addSubCategory)
    .get(subCategoryController.getSubCategories)
    router.patch('/:subCategoryId',Auth(), fileUpload().single('image'), subCategoryController.updateSubCategory)

export default router
