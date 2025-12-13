import express from "express";
import { createPurchase, getPurchasesByCustomerId, getPurchaseDocuments} from "../controllers/Purchase.controller";

const router = express.Router();

router.post("/insurance", createPurchase);
router.get("/customer/:customer_id", getPurchasesByCustomerId);

router.get("/:id/documents", getPurchaseDocuments);

export default router;