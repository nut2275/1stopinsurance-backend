import { Request, Response } from "express";
import mongoose from "mongoose";

import Car from "../models/Car.model";
import Purchase from "../models/Purchase.model";
import Agent from "../models/Agent.model";
import PolicyCounter from "../models/PolicyCounter.model";

/* =====================================================
   🔢 Generate Running Policy Number
   Format: PLN-YYYY-000001
===================================================== */
const generateRunningPolicyNumber = async () => {
  const year = new Date().getFullYear();

  const counter = await PolicyCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true
    }
  );

  const runningNumber = String(counter.seq).padStart(6, "0");

  return `PLN-${year}-${runningNumber}`;
};

/* =====================================================
   ✅ CREATE PURCHASE
===================================================== */
export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      agent_id,
      plan_id,
      brand,
      carModel,
      subModel,
      year,
      registration,
      province,
      color,
      citizenCardImage,
      carRegistrationImage
    } = req.body;

    console.log("📌 Body received:", req.body);

    /* ---------- 1️⃣ Find or Create Car ---------- */
    let car = await Car.findOne({
      customer_id,
      registration,
      province
    });

    if (!car) {
      car = await Car.create({
        customer_id: new mongoose.Types.ObjectId(customer_id),
        brand,
        carModel,
        subModel,
        year,
        registration,
        province,
        color
      });
    }

    /* ---------- 2️⃣ Select Agent ---------- */
    let selectedAgent = null;

    if (agent_id) {
      selectedAgent = await Agent.findById(agent_id);
    }

    if (!selectedAgent) {
      selectedAgent = await Agent.findOne().sort({ assigned_count: 1 });
    }

    if (!selectedAgent) {
      return res.status(400).json({ message: "ไม่พบตัวแทนประกัน" });
    }

    /* ---------- 3️⃣ Generate Policy Number ---------- */
    const policyNumber = await generateRunningPolicyNumber();

    /* ---------- 4️⃣ Create Purchase ---------- */
    const purchase = await Purchase.create({
      customer_id,
      agent_id: selectedAgent._id,
      car_id: car._id,
      carInsurance_id: plan_id,
      citizenCardImage,
      carRegistrationImage,
      policy_number: policyNumber,
      status: "pending"
    });

    /* ---------- 5️⃣ Update Agent Workload ---------- */
    await Agent.findByIdAndUpdate(selectedAgent._id, {
      $inc: { assigned_count: 1 }
    });

    res.status(201).json({
      message: "สร้างคำสั่งซื้อสำเร็จ",
      purchaseId: purchase._id,
      policy_number: purchase.policy_number,
      car: {
        id: car._id,
        registration: car.registration,
        province: car.province
      },
      agent: {
        id: selectedAgent._id,
        name: selectedAgent.first_name
      }
    });
  } catch (error) {
    console.error("❌ CREATE PURCHASE ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* =====================================================
   ✅ GET PURCHASES BY CUSTOMER ID
===================================================== */
export const getPurchasesByCustomerId = async (req: Request, res: Response) => {
  try {
    const { customer_id } = req.params;

    const purchases = await Purchase.find({ customer_id })
      .populate("car_id", "registration brand carModel color")
      .populate("carInsurance_id")
      .sort({ createdAt: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    console.error("❌ Error fetching purchases:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

/* =====================================================
   ✅ GET PURCHASE DOCUMENTS
===================================================== */
export const getPurchaseDocuments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findById(id).select(
      "citizenCardImage carRegistrationImage policy_number"
    );

    if (!purchase) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการซื้อประกัน" });
    }

    res.json({
      policyNumber: purchase.policy_number,
      citizenCardImage: purchase.citizenCardImage,
      carRegistrationImage: purchase.carRegistrationImage
    });
  } catch (error) {
    console.error("❌ GET PURCHASE DOCUMENT ERROR:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
