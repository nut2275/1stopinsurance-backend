import express from "express";
import { 
    createPurchase, getPurchasesByCustomerId, 
    getPurchaseDocuments,
    getPurchaseById,
    getAllPurchases,
    updatePurchaseAdmin
} from "../controllers/Purchase.controller";

const router = express.Router();

router.post("/insurance", createPurchase);
router.get("/customer/:customer_id", getPurchasesByCustomerId);

router.get("/:id/documents", getPurchaseDocuments);
router.get('/:id', getPurchaseById);

router.get("/admin/all", getAllPurchases);
router.put("/admin/:id", updatePurchaseAdmin);

export default router;