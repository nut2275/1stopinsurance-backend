import express from "express";
import { 
    getPlans, 
    addInsurance,
    getAllInsurances,
    updateInsuranceRate,
    deleteInsuranceRate,
    getInsuranceRateById
} from "../controllers/CarInsuranceRate.controller";

const router = express.Router();

router.get("/plans", getPlans);
router.post("/insurance", addInsurance);


// ADMIN ////
router.get('/admin/insurance', getAllInsurances);
router.put('/admin/insurance/:id', updateInsuranceRate);
router.delete('/admin/insurance/:id', deleteInsuranceRate);
router.get('/admin/insurance/:id', getInsuranceRateById);

export default router;
