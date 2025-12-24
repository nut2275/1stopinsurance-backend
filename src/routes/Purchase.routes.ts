import express from "express";
import { 
    createPurchase, 
    getPurchasesByCustomerId, 
    getPurchaseDocuments,
    getPurchaseById,
    getAllPurchases,
    updatePurchaseAdmin,
    getAgentHistory,       // ✅ Import
    updatePurchaseAgent    // ✅ Import
} from "../controllers/Purchase.controller";

import { verifyToken, isAgent, isAdmin } from "../middleware/auth";

const router = express.Router();

// --- Public / Customer ---
router.post("/insurance", createPurchase);
router.get("/customer/:customer_id", getPurchasesByCustomerId);
router.get("/:id/documents", getPurchaseDocuments);
router.get('/:id', getPurchaseById);

// --- Admin ---
router.get("/admin/all", getAllPurchases);
router.put("/admin/:id", updatePurchaseAdmin);

// --- Agent ---
// ✅ ใช้ verifyToken (เพื่อแตก req.user) และ isAgent (เพื่อกันคนอื่น)
router.get("/agent/my-history", verifyToken, isAgent, getAgentHistory);
router.put("/agent/:id", verifyToken, isAgent, updatePurchaseAgent);

export default router;