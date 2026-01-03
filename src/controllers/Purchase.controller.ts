import { Request, Response } from "express";
import mongoose from "mongoose";

import Car from "../models/Car.model";
import Purchase from "../models/Purchase.model";
import Agent from "../models/Agent.model";
import PolicyCounter from "../models/PolicyCounter.model";
import CarInsurance from "../models/CarInsuranceRate.model";
import Customer from "../models/Customer.model";

// ---------------------------------------------------------
// 🟢 SECTION: HELPER FUNCTIONS
// ---------------------------------------------------------

/* Generate Running Policy Number (PLN-YYYY-000001) */
const generateRunningPolicyNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await PolicyCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const runningNumber = String(counter.seq).padStart(6, "0");
  return `PLN-${year}-${runningNumber}`;
};

// ---------------------------------------------------------
// 🟢 SECTION: PUBLIC / SHARED CONTROLLERS
// ---------------------------------------------------------

export const getPurchaseById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
             return res.status(400).json({ message: "รูปแบบ ID ไม่ถูกต้อง" });
        }

        const purchase = await Purchase.findById(id)
            .populate('customer_id', 'first_name last_name email phone') 
            .populate('agent_id', 'first_name last_name agent_license_number phone idLine imgProfile')
            .populate('car_id') 
            .populate('carInsurance_id');

        if (!purchase) {
            return res.status(404).json({ message: "ไม่พบข้อมูลกรมธรรม์/ใบสั่งซื้อนี้" });
        }

        res.status(200).json(purchase);

    } catch (err: unknown) {
        const error = err as Error;
        console.error("Error getPurchaseById:", error.message);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
    }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      customer_id, agent_id, plan_id,
      brand, carModel, subModel, year, registration, province, color,
      citizenCardImage, carRegistrationImage
    } = req.body;

    console.log("📌 Body received:", req.body);

    /* 1️⃣ Find or Create Car */
    let car = await Car.findOne({ customer_id, registration, province });

    if (!car) {
      car = await Car.create({
        customer_id: new mongoose.Types.ObjectId(customer_id),
        brand, carModel, subModel, year, registration, province, color
      });
    }

    /* 2️⃣ Select Agent */
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

    /* 3️⃣ Generate Policy Number */
    const policyNumber = await generateRunningPolicyNumber();

    /* 4️⃣ Create Purchase */
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

    /* 5️⃣ Update Agent Workload */
    await Agent.findByIdAndUpdate(selectedAgent._id, {
      $inc: { assigned_count: 1 }
    });

    res.status(201).json({
      message: "สร้างคำสั่งซื้อสำเร็จ",
      purchaseId: purchase._id,
      policy_number: purchase.policy_number,
      car: { id: car._id, registration: car.registration, province: car.province },
      agent: { id: selectedAgent._id, name: selectedAgent.first_name }
    });
  } catch (error) {
    console.error("❌ CREATE PURCHASE ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

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

export const getPurchaseDocuments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findById(id).select(
      "citizenCardImage carRegistrationImage policy_number paymentSlipImage installmentDocImage consentFormImage paymentMethod policyFile"
    );

    if (!purchase) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการซื้อประกัน" });
    }

    res.json({
      policyNumber: purchase.policy_number,
      citizenCardImage: purchase.citizenCardImage,
      carRegistrationImage: purchase.carRegistrationImage,
      paymentMethod: purchase.paymentMethod, 
      paymentSlipImage: purchase.paymentSlipImage,
      installmentDocImage: purchase.installmentDocImage,
      consentFormImage: purchase.consentFormImage,
      policyDocumentImage: purchase.policyFile 
    });
  } catch (error) {
    console.error("❌ GET PURCHASE DOCUMENT ERROR:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// ---------------------------------------------------------
// 🟢 SECTION: ADMIN CONTROLLERS
// ---------------------------------------------------------

export const getAllPurchases = async (req: Request, res: Response) => {
  try {
    const purchases = await Purchase.find()
      // ✅ [FIXED] เพิ่ม email, phone, imgProfile_customer
      .populate("customer_id", "first_name last_name username imgProfile_customer email phone") 
      .populate("agent_id", "first_name last_name") 
      .populate("car_id", "registration brand carModel subModel year color province") 
      // ✅ [FIXED] เพิ่ม premium
      .populate("carInsurance_id", "insuranceBrand level premium") 
      .sort({ createdAt: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching all purchases:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const updatePurchaseAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status, policy_number, start_date, end_date, paymentMethod,
      paymentSlipImage, policyFile, citizenCardImage, carRegistrationImage, installmentDocImage, consentFormImage,
      customer_first_name, customer_last_name,
      car_brand, car_model, car_submodel, car_year, car_color, car_registration, car_province,
      insurance_brand, insurance_level,
      reject_reason
    } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    // 1. Admin แก้ชื่อลูกค้าได้
    if (purchase.customer_id) {
      await Customer.findByIdAndUpdate(purchase.customer_id, {
        first_name: customer_first_name,
        last_name: customer_last_name
      });
    }

    // 2. แก้ข้อมูลรถ
    if (purchase.car_id) {
      await Car.findByIdAndUpdate(purchase.car_id, {
        brand: car_brand, 
        carModel: car_model, 
        subModel: car_submodel, 
        year: car_year, 
        color: car_color, 
        registration: car_registration, 
        province: car_province
      });
    }

    // 3. แก้ข้อมูลประกัน
    if (purchase.carInsurance_id) {
       await CarInsurance.findByIdAndUpdate(purchase.carInsurance_id, {
         insuranceBrand: insurance_brand, level: insurance_level
       });
    }

    // 4. Update Purchase
    const updateData: any = { status, policy_number, paymentMethod };
    if (status === 'rejected') updateData.reject_reason = reject_reason;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    
    // Images
    if (paymentSlipImage) updateData.paymentSlipImage = paymentSlipImage;
    if (policyFile) updateData.policyFile = policyFile;
    if (citizenCardImage) updateData.citizenCardImage = citizenCardImage;
    if (carRegistrationImage) updateData.carRegistrationImage = carRegistrationImage;
    if (installmentDocImage) updateData.installmentDocImage = installmentDocImage;
    if (consentFormImage) updateData.consentFormImage = consentFormImage;

    const updatedPurchase = await Purchase.findByIdAndUpdate(id, updateData, { new: true })
        // ✅ [FIXED] เพิ่ม email, phone
        .populate("customer_id", "first_name last_name username imgProfile_customer email phone")
        .populate("car_id")
        .populate("carInsurance_id");

    res.status(200).json({ message: "Update success", data: updatedPurchase });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ---------------------------------------------------------
// 🟢 SECTION: AGENT CONTROLLERS (New!)
// ---------------------------------------------------------



// ฟังก์ชันสำหรับ "ตรวจสุขภาพกรมธรรม์" และอัปเดตสถานะอัตโนมัติ
const autoUpdateStatus = async (agentId: mongoose.Types.ObjectId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // เคลียร์เวลาให้เป็นเที่ยงคืน

    const next60Days = new Date(today);
    next60Days.setDate(today.getDate() + 60);

    // 1️⃣ เคส: หมดอายุแล้ว (เลยกำหนด End Date)
    // เปลี่ยน Active/About_to_expire -> Expired
    await Purchase.updateMany(
        {
            agent_id: agentId,
            status: { $in: ['active', 'about_to_expire'] }, // สถานะที่ต้องเช็ค
            end_date: { $lt: today } // วันสิ้นสุด "น้อยกว่า" วันนี้
        },
        { $set: { status: 'expired' } }
    );

    // 2️⃣ เคส: ใกล้หมดอายุ (เหลือ 0-60 วัน)
    // เปลี่ยน Active -> About_to_expire
    // (ต้องเช็คว่า end_date >= today เพื่อไม่ให้ทับกับเคส Expired)
    await Purchase.updateMany(
        {
            agent_id: agentId,
            status: 'active', // เช็คเฉพาะ Active (ถ้าเป็น Expired แล้วไม่ต้องยุ่ง)
            end_date: { 
                $gte: today, 
                $lte: next60Days 
            }
        },
        { $set: { status: 'about_to_expire' } }
    );
    
    // (Optional) 3️⃣ เคส: ต่ออายุแล้วแต่สถานะยังค้าง (เช่น แก้ไขวันที่หนีไปปีหน้าแล้ว)
    // เปลี่ยน About_to_expire -> Active
    await Purchase.updateMany(
        {
            agent_id: agentId,
            status: 'about_to_expire',
            end_date: { $gt: next60Days } // วันสิ้นสุด "มากกว่า" 60 วัน (ปลอดภัยแล้ว)
        },
        { $set: { status: 'active' } }
    );
};


/* ✅ 1. ดึงประวัติการขายเฉพาะของ Agent คนนั้น */
export const getAgentHistory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const agentId = user?.id || user?._id || user?.agent_id;

        if (!agentId) {
            return res.status(401).json({ message: "Unauthorized: Agent ID not found" });
        }

        await autoUpdateStatus(agentId);
        const purchases = await Purchase.find({ agent_id: agentId })
            // ✅ เพิ่ม email, phone
            .populate("customer_id", "first_name last_name username email phone imgProfile_customer") 
            .populate("car_id")
            // ✅ เพิ่ม premium
            .populate("carInsurance_id", "insuranceBrand level premium") 
            .populate("agent_id", "first_name last_name") 
            .sort({ createdAt: -1 });

        res.status(200).json(purchases);
    } catch (error) {
        console.error("Agent History Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};


/* ✅ 2. Agent แก้ไขข้อมูล */
export const updatePurchaseAgent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const agentId = user?.id || user?._id || user?.agent_id;

        const {
             status, policy_number, start_date, end_date, paymentMethod,
             paymentSlipImage, policyFile, citizenCardImage, carRegistrationImage, installmentDocImage, consentFormImage,
             car_brand, car_model, car_submodel, car_year, car_color, car_registration, car_province,
             insurance_brand, insurance_level,
             reject_reason
        } = req.body;

        const purchase = await Purchase.findOne({ _id: id, agent_id: agentId });
        
        if (!purchase) {
            return res.status(404).json({ message: "ไม่พบรายการ หรือคุณไม่มีสิทธิ์แก้ไขรายการนี้" });
        }

        // Update Car Info
        if (purchase.car_id) {
             await Car.findByIdAndUpdate(purchase.car_id, {
                 brand: car_brand, 
                 carModel: car_model, 
                 subModel: car_submodel, // ✅ อัปเดตรุ่นย่อย
                 year: car_year, 
                 color: car_color, 
                 registration: car_registration, 
                 province: car_province
             });
        }
 
        // Update Insurance Info (ถ้า Agent มีสิทธิ์แก้แผน)
        if (purchase.carInsurance_id) {
             await CarInsurance.findByIdAndUpdate(purchase.carInsurance_id, {
                 insuranceBrand: insurance_brand, level: insurance_level
             });
        }
 
        const updateData: any = { status, policy_number, paymentMethod };
        if (status === 'rejected') updateData.reject_reason = reject_reason;
        if (start_date) updateData.start_date = start_date;
        if (end_date) updateData.end_date = end_date;
 
        // Update Images
        if (paymentSlipImage) updateData.paymentSlipImage = paymentSlipImage;
        if (policyFile) updateData.policyFile = policyFile;
        if (citizenCardImage) updateData.citizenCardImage = citizenCardImage;
        if (carRegistrationImage) updateData.carRegistrationImage = carRegistrationImage;
        if (installmentDocImage) updateData.installmentDocImage = installmentDocImage;
        if (consentFormImage) updateData.consentFormImage = consentFormImage;
 
        const updatedPurchase = await Purchase.findByIdAndUpdate(id, updateData, { new: true })
             // ✅ Populate ข้อมูลกลับไปให้ครบ
             .populate("customer_id", "first_name last_name username email phone imgProfile_customer")
             .populate("car_id")
             .populate("carInsurance_id", "insuranceBrand level premium")
             .populate("agent_id", "first_name last_name");
 
        res.status(200).json({ message: "Agent update success", data: updatedPurchase });
 
    } catch (error) {
        console.error("Agent Update Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

export const getPurchaseCount = async (req: Request, res: Response) => {
  try {
    // ใช้คำสั่ง countDocuments() ของ Mongoose เพื่อนับจำนวนทั้งหมด
    const count = await Purchase.countDocuments();
    
    // ส่งค่ากลับไปเป็น JSON
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error counting purchases:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};