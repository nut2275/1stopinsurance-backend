import { Router } from "express";
import {
  getBrands,
  getModelsByBrand,
  getVariants,
} from "../controllers/CarData.controller";

const router = Router();

router.get("/brands", getBrands);
router.get("/models", getModelsByBrand);
router.get("/variants", getVariants);

export default router;
