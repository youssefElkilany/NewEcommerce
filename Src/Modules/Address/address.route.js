import { Router } from 'express'
import * as addressController from './Controller/address.js'
import Auth from '../../Middelware/auth.js'
import {
    validateAddressId,
    validateCreateAddress,
    validateUpdateAddress
} from './validation.js'

const router = Router()

router.use(Auth())

router.route('/')
    .post(validateCreateAddress,addressController.createAddress)
    .get(addressController.getAddresses)

router.route('/:addressId')
    .get(validateAddressId,addressController.getAddress)
    .patch(validateAddressId,validateUpdateAddress,addressController.updateAddress)
    .delete(validateAddressId,addressController.deleteAddress)

export default router
