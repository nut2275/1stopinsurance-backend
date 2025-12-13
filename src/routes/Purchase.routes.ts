import express from "express";
import { createPurchase, getPurchasesByCustomerId } from "../controllers/Purchase.controller";

const router = express.Router();

router.post("/insurance", createPurchase);
router.get("/customer/:customer_id", getPurchasesByCustomerId);

export default router;