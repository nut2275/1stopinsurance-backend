import express from "express";
import {
    getAllCustomers,
    updateCustomerByAdmin,
    getCustomerDetail,
    resetCustomerPassword,
    getAgentsList
} from '../../controllers/Admin/Customer.controller'


const router = express.Router();

router.get('/customers', getAllCustomers);
router.put('/customers/:id', updateCustomerByAdmin);
router.get('/customers/:id', getCustomerDetail);
router.put('/customers/:id/reset-password', resetCustomerPassword);
router.get('/agents-dropdown', getAgentsList);

export default router;