import { Router } from "express";
import * as regController from './Controller/registration.js'
import Auth from "../../Middelware/auth.js";
const router = Router()


router.post('/signup',regController.signUp)
router.post('/login',regController.login)
router.get('/emailConfirmation/:token',regController.confirmEmail)
router.get("/newconfirmationemail/:token",regController.ResendEmail)
router.patch('/passcode',regController.forgetPasswordCode)
router.patch('/resetcode',regController.resetPasswordCode)
router.patch('/forgetlink',regController.forgetPasswordLink)
router.patch('/resetlink',regController.resetPasswordLink)


export default router