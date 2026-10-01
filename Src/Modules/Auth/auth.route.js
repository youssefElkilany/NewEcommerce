import { Router } from "express";
import * as regController from './Controller/registration.js'
import { validationn } from '../../Middelware/validation.js'
import * as schemas from './validation.js'
const router = Router()


router.post('/signup',validationn(schemas.signUp, ['body']),regController.signUp)
router.post('/login',validationn(schemas.login, ['body']),regController.login)
router.get('/emailConfirmation/:token',validationn(schemas.confirmEmail, ['params']),regController.confirmEmail)
router.get("/newconfirmationemail/:token",validationn(schemas.ResendEmail, ['params']),regController.ResendEmail)
router.patch('/passcode',validationn(schemas.forgetPasswordCode, ['body']),regController.forgetPasswordCode)
router.patch('/resetcode',validationn(schemas.resetPasswordCode, ['body']),regController.resetPasswordCode)
router.patch('/forgetlink',validationn(schemas.forgetPasswordLink, ['body']),regController.forgetPasswordLink)
router.patch('/resetlink/:token',validationn(schemas.resetPasswordLink, ['body', 'params']),regController.resetPasswordLink)


export default router
