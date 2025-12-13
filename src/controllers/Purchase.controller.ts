import { Request, Response } from "express";
import Car from "../models/Car.model";
import Purchase from "../models/Purchase.model";

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      agent_id,
      plan_id,
      carBrand,
      carModel,
      subModel,
      carYear,
      registration,
      color,
      citizenCardImage,
      carRegistrationImage
    } = req.body;

    console.log("📌 Body received:", req.body);

    // ✔ 1. บันทึกรถก่อน
    const car = await Car.create({
      customer_id,
      brand: carBrand,
      carModel,
      subModel,
      year: carYear,
      registration,
      color
    });

    console.log("🚗 New car saved:", car);

    // ✔ 2. สร้างเลขกรมธรรม์
    const policyNumber = "PLN-" + Date.now();

    // ✔ 3. บันทึกข้อมูล purchase
    const purchase = await Purchase.create({
      customer_id,
      agent_id: agent_id || null,
      car_id: car._id,
      carInsurance_id: plan_id,
      policy_number: policyNumber,
      citizenCardImage,
      carRegistrationImage,
      status: "pending"
    });

    console.log("📄 Purchase saved:", purchase);

    res.status(201).json({
      message: "Purchase created successfully",
      purchase
    });

  } catch (error) {
    console.error("🔥 Error creating purchase:", error);
    res.status(500).json({
      message: "Internal server error",
      error
    });
  }
};
