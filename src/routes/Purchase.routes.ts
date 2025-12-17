import express from "express";
import { 
    createPurchase, getPurchasesByCustomerId, 
    getPurchaseDocuments,
    getPurchaseById
} from "../controllers/Purchase.controller";

const router = express.Router();

router.post("/insurance", createPurchase);
router.get("/customer/:customer_id", getPurchasesByCustomerId);

router.get("/:id/documents", getPurchaseDocuments);
router.get('/:id', getPurchaseById);

export default router;