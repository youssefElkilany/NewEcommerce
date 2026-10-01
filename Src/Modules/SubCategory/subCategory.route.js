import { Router } from 'express'
import * as subCategoryController from './Controller/subCategory.js'
import fileUpload from '../../Utills/multer.cloud.js'
import Auth from '../../Middelware/auth.js'
import { roles, validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
const router = Router({mergeParams:true})

router.route('/')
    .post(Auth([roles.Seller]), fileUpload().single('image'), validationn(schemas.addSubCategory), subCategoryController.addSubCategory)
    .get(validationn(schemas.getSubCategories), subCategoryController.getSubCategories)
    router.patch('/:subCategoryId',Auth([roles.Seller]), fileUpload().single('image'), validationn(schemas.updateSubCategory), subCategoryController.updateSubCategory)

export default router
