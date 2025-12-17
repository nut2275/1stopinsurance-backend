import { Request, Response } from "express";
import CarData from "../models/CarData.model";

/**
 * GET /api/car-data/brands
 */
export const getBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await CarData.find({}, { brand: 1, _id: 0 });

    res.status(200).json(brands.map((b) => b.brand));
  } catch (error) {
    console.error("getBrands error:", error);
    res.status(500).json({ message: "Failed to fetch brands" });
  }
};

/**
 * GET /api/car-data/models?brand=Toyota
 */
export const getModelsByBrand = async (req: Request, res: Response) => {
  try {
    const { brand } = req.query as { brand?: string };

    if (!brand) {
      return res.status(400).json({ message: "brand is required" });
    }

    const data = await CarData.findOne({ brand });

    res.status(200).json(data?.models.map((m) => m.name) ?? []);
  } catch (error) {
    console.error("getModelsByBrand error:", error);
    res.status(500).json({ message: "Failed to fetch models" });
  }
};

/**
 * GET /api/car-data/variants?brand=Toyota&model=Camry
 */
export const getVariants = async (req: Request, res: Response) => {
  try {
    const { brand, model } = req.query as {
      brand?: string;
      model?: string;
    };

    if (!brand || !model) {
      return res
        .status(400)
        .json({ message: "brand and model are required" });
    }

    const data = await CarData.findOne({ brand });
    const foundModel = data?.models.find((m) => m.name === model);

    res.status(200).json(foundModel?.variants ?? []);
  } catch (error) {
    console.error("getVariants error:", error);
    res.status(500).json({ message: "Failed to fetch variants" });
  }
};
