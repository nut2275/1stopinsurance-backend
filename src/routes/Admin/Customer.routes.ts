import express from "express";
import {
    findAllCustomerPurchase,
} from '../../controllers/Admin/Customer.controller'


const router = express.Router();

router.get("/customer-purchases", findAllCustomerPurchase);

export default router;