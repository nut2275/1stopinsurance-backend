import express from "express";
import { createPurchase} from "../controllers/Purchase.controller";

const router = express.Router();

router.post("/insurance", createPurchase);

export default router;
