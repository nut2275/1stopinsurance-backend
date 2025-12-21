import { Request, Response } from "express";
import mongoose from "mongoose";

import Car from "../models/Car.model";
import Purchase from "../models/Purchase.model";
import Agent from "../models/Agent.model";
import PolicyCounter from "../models/PolicyCounter.model";
import CarInsurance from "../models/CarInsuranceRate.model";
import Customer from "../models/Customer.model";


export const getPurchaseById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // ตรวจสอบว่า ID ถูกต้องตาม format ของ MongoDB หรือไม่ (ป้องกัน CastError)
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
             return res.status(400).json({ message: "รูปแบบ ID ไม่ถูกต้อง" });
        }

        // ค้นหาและ Populate ข้อมูลที่เชื่อมโยง (Join Table)
        const purchase = await Purchase.findById(id)
            .populate('customer_id', 'first_name last_name email phone') // เอาแค่ข้อมูลพื้นฐานลูกค้า (ไม่เอา password)
            .populate('agent_id', 'first_name last_name agent_license_number phone idLine imgProfile') // ข้อมูล Agent สำหรับหน้า Contact
            .populate('car_id') // ข้อมูลรถทั้งหมด
            .populate('carInsurance_id'); // ข้อมูลแผนประกัน

        if (!purchase) {
            return res.status(404).json({ message: "ไม่พบข้อมูลกรมธรรม์/ใบสั่งซื้อนี้" });
        }

        res.status(200).json(purchase);

    } catch (err: unknown) {
        // Error Handling แบบ Senior (No any)
        const error = err as Error;
        console.error("Error getPurchaseById:", error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
    }
};


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

    // ✅ เพิ่ม field ที่ต้องใช้: paymentMethod, installmentDocImage, consentFormImage, paymentSlipImage
    const purchase = await Purchase.findById(id).select(
      "citizenCardImage carRegistrationImage policy_number paymentSlipImage installmentDocImage consentFormImage paymentMethod policyFile"
    );

    if (!purchase) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการซื้อประกัน" });
    }

    // ส่งกลับไปให้ Frontend
    res.json({
      policyNumber: purchase.policy_number,
      citizenCardImage: purchase.citizenCardImage,
      carRegistrationImage: purchase.carRegistrationImage,
      // ✅ ส่งค่าใหม่กลับไป
      paymentMethod: purchase.paymentMethod, 
      paymentSlipImage: purchase.paymentSlipImage,
      installmentDocImage: purchase.installmentDocImage,
      consentFormImage: purchase.consentFormImage,
      policyDocumentImage: purchase.policyFile // ถ้ามีไฟล์กรมธรรม์
    });
  } catch (error) {
    console.error("❌ GET PURCHASE DOCUMENT ERROR:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};


export const getAllPurchases = async (req: Request, res: Response) => {
  try {
    const purchases = await Purchase.find()
      .populate("customer_id", "first_name last_name username") // ดึงชื่อลูกค้า
      .populate("agent_id", "first_name last_name") // ถ้ามี Agent Model ให้เปิดบรรทัดนี้
      .populate("car_id", "registration brand carModel year color province") 
      .populate("carInsurance_id", "insuranceBrand level") // ดึงชื่อบริษัทและชั้น
      .sort({ createdAt: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching all purchases:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// 2. อัปเดตข้อมูล (แก้ไขสถานะ, ใส่เลขกรมธรรม์, อัปโหลดเอกสารเพิ่ม)
export const updatePurchaseAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // รับค่าทั้งหมดจาก Frontend (รวม Field ใหม่ที่เพิ่มเข้ามา)
    const {
      // --- ข้อมูล Purchase หลัก ---
      status,
      policy_number,
      start_date,
      end_date,            // ✅ เพิ่มใหม่
      paymentMethod,       // ✅ เพิ่มใหม่

      // --- รูปภาพต่างๆ ---
      paymentSlipImage,
      policyFile,
      citizenCardImage,     
      carRegistrationImage, 
      installmentDocImage, // ✅ เพิ่มใหม่
      consentFormImage,    // ✅ เพิ่มใหม่

      // --- ข้อมูล Customer (Ref) ---
      customer_first_name,
      customer_last_name,

      // --- ข้อมูล Car (Ref) ---
      car_brand,
      car_model,
      car_year,
      car_color,
      car_registration,
      car_province,        // ✅ รับค่าจังหวัดจาก Frontend

      // --- ข้อมูล Insurance (Ref) ---
      insurance_brand,
      insurance_level,

      reject_reason
    } = req.body;

    // 1. หา Purchase ตัวหลักก่อน
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    // 2. อัปเดตข้อมูลลูกค้า (Customer)
    if (purchase.customer_id) {
      await Customer.findByIdAndUpdate(purchase.customer_id, {
        first_name: customer_first_name,
        last_name: customer_last_name
      });
    }

    // 3. อัปเดตข้อมูลรถ (Car)
    if (purchase.car_id) {
      await Car.findByIdAndUpdate(purchase.car_id, {
        brand: car_brand,
        carModel: car_model, 
        year: car_year,
        color: car_color,
        registration: car_registration,
        province: car_province // ✅ อัปเดตจังหวัดลงฐานข้อมูล
      });
    }

    // 4. อัปเดตข้อมูลประกัน (CarInsurance)
    // หมายเหตุ: การแก้ตรงนี้จะเปลี่ยนข้อมูล Master Data ถ้าประกันนี้ใช้ร่วมกันหลายคนอาจกระทบคนอื่น
    if (purchase.carInsurance_id) {
       await CarInsurance.findByIdAndUpdate(purchase.carInsurance_id, {
         insuranceBrand: insurance_brand,
         level: insurance_level
       });
    }

    // 5. เตรียมข้อมูลสำหรับอัปเดต Purchase
    const updateData: any = {
      status,
      policy_number,
      paymentMethod,
    };

    // ✅ Logic การบันทึกเหตุผล
    if (status === 'rejected') {
        // ถ้าสถานะเป็น Rejected ให้บันทึกเหตุผลลงไป
        updateData.reject_reason = reject_reason;
    } else {
        // (Optional) ถ้าเปลี่ยนสถานะกลับเป็นอย่างอื่น อาจจะเคลียร์เหตุผลทิ้ง หรือเก็บไว้ก็ได้
        // updateData.reject_reason = null; 
    }

    // ✅ จัดการวันที่ (เช็คว่ามีค่าส่งมาหรือไม่ เพื่อป้องกัน error วันที่ว่างเปล่า)
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;

    // ✅ อัปเดตรูปภาพ (เช็คว่ามีค่าส่งมาหรือไม่ จะได้ไม่ทับด้วย null)
    if (paymentSlipImage) updateData.paymentSlipImage = paymentSlipImage;
    if (policyFile) updateData.policyFile = policyFile;
    if (citizenCardImage) updateData.citizenCardImage = citizenCardImage;
    if (carRegistrationImage) updateData.carRegistrationImage = carRegistrationImage;
    
    // รูปใหม่
    if (installmentDocImage) updateData.installmentDocImage = installmentDocImage;
    if (consentFormImage) updateData.consentFormImage = consentFormImage;

    // 6. ทำการอัปเดตและ Populate ข้อมูลกลับไป
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // return ค่าใหม่กลับไป
    )
    .populate("customer_id")
    .populate("car_id")
    .populate("carInsurance_id");

    res.status(200).json({ message: "Update success", data: updatedPurchase });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};