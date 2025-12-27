import { Request, Response } from "express";
import mongoose, { PipelineStage } from "mongoose"; // ✅ Import mongoose เข้ามาแก้ Error 500
import CustomerModel from "../../models/Customer.model";
import PurchaseModel from "../../models/Purchase.model";
import CarModel from "../../models/Car.model";
import bcrypt from 'bcryptjs';
import AgentModel from "../../models/Agent.model";

// ==========================================
// 1. ดึงข้อมูลลูกค้า "ทั้งระบบ" (Global View) 
// ✅ รองรับ Pagination + Filter Status + Filter Agent
// ==========================================
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    
    // รับค่า Filter
    const statusFilter = req.query.status as string; 
    const agentIdFilter = req.query.agentId as string;

    const skip = (page - 1) * limit;
    const pipeline: PipelineStage[] = [];

    // --- A. Search Logic ---
    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        pipeline.push({
            $match: {
                $or: [
                    { first_name: searchRegex },
                    { last_name: searchRegex },
                    { phone: searchRegex },
                    { email: searchRegex }
                ]
            }
        });
    }

    // --- B. Join Tables ---
    pipeline.push(
      {
        $lookup: { from: "purchases", localField: "_id", foreignField: "customer_id", as: "purchases" }
      },
      {
        $lookup: { from: "cars", localField: "_id", foreignField: "customer_id", as: "cars" }
      }
    );

    // --- C. Advanced Filters Logic (กรองหลัง Join) ---
    const matchStage: any = {};

    // 1. กรองตาม Agent (ต้องเช็คว่า ID ถูกต้องก่อนแปลง)
    if (agentIdFilter && mongoose.Types.ObjectId.isValid(agentIdFilter)) {
        matchStage["purchases.agent_id"] = new mongoose.Types.ObjectId(agentIdFilter);
    }

    // 2. กรองตามสถานะ
    if (statusFilter) {
        if (statusFilter === 'active') {
            matchStage["purchases.status"] = 'active';
        } else if (statusFilter === 'pending') {
            matchStage["purchases.status"] = { $in: ['pending', 'pending_payment'] };
        } else if (statusFilter === 'expired') {
            matchStage["purchases.status"] = 'expired';
        } else if (statusFilter === 'never') {
            // purchases array ว่าง = ไม่เคยซื้อ
            matchStage["purchases"] = { $size: 0 };
        }
    }

    // ยัดใส่ Pipeline
    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }

    // --- D. Project & Calculate ---
    pipeline.push({
        $project: {
            first_name: 1, last_name: 1, phone: 1, email: 1, imgProfile_customer: 1, createdAt: 1,
            totalCars: { $size: "$cars" },
            activePolicies: {
                $size: {
                    $filter: {
                        input: "$purchases",
                        as: "p",
                        cond: { $eq: ["$$p.status", "active"] }
                    }
                }
            },
            // หา Unique Agent IDs
            relatedAgentIds: { $setUnion: ["$purchases.agent_id", []] }
        }
    });

    // Lookup Agents Names
    pipeline.push({
        $lookup: { from: "agents", localField: "relatedAgentIds", foreignField: "_id", as: "agentsInfo" }
    });

    // Final Project
    pipeline.push({
        $project: {
            first_name: 1, last_name: 1, phone: 1, email: 1, imgProfile_customer: 1, createdAt: 1,
            totalCars: 1, activePolicies: 1,
            agents: {
                $map: {
                    input: "$agentsInfo",
                    as: "a",
                    in: { first_name: "$$a.first_name", last_name: "$$a.last_name" }
                }
            }
        }
    });

    // --- E. Facet (Pagination Core) ---
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [ { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit } ]
        }
    });

    const result = await CustomerModel.aggregate(pipeline);
    const data = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.json({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error: unknown) {
    console.error("Admin Get Customers Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ==========================================
// 2. ดึงข้อมูลลูกค้า 1 คน (Detail Page)
// ✅ ใช้สำหรับหน้า /root/admin/customers/[id]
// ==========================================
export const getCustomerDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const profile = await CustomerModel.findById(id).select('-password');
        if(!profile) return res.status(404).json({error: "Not Found"});

        const garage = await CarModel.find({ customer_id: id }).sort({ createdAt: -1 });

        const history = await PurchaseModel.find({ customer_id: id })
            .populate({ path: 'carInsurance_id', select: 'insuranceBrand level premium' })
            .populate({ path: 'car_id', select: 'brand registration' })
            .populate({ path: 'agent_id', select: 'first_name last_name' })
            .sort({ createdAt: -1 });

        // คำนวณยอด LTV เฉพาะที่จ่ายแล้ว
        const PAID_STATUSES = ['active', 'expired', 'about_to_expire'];
        const totalSpent = history.reduce((sum, item: any) => {
            if (PAID_STATUSES.includes(item.status)) {
                return sum + (item.carInsurance_id?.premium || 0);
            }
            return sum;
        }, 0);

        res.json({
            profile,
            garage,
            history,
            stats: {
                totalSpent,
                totalPolicies: history.length,
                activePolicies: history.filter(h => h.status === 'active').length
            }
        });
    } catch (error) {
        console.error("Get Detail Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

// ==========================================
// 3. อัปเดตข้อมูลลูกค้า (Admin Edit)
// ==========================================
export const updateCustomerByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // ป้องกันการแก้รหัสผ่านผิดทาง
        delete updates.password;
        delete updates.username;

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(
            id, 
            { $set: updates },
            { new: true }
        );

        if (!updatedCustomer) {
             res.status(404).json({ error: "Customer not found" });
             return;
        }

        res.json(updatedCustomer);
    } catch (error: unknown) {
        res.status(500).json({ error: "Update failed" });
    }
};

// ==========================================
// 4. Reset Password โดย Admin
// ==========================================
export const resetCustomerPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
             res.status(400).json({ error: "Password must be at least 6 chars" });
             return;
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await CustomerModel.findByIdAndUpdate(id, { password: hashedPassword });

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Reset password failed" });
    }
};

// 5. ดึงรายชื่อ Agent ทั้งหมด (เฉพาะชื่อ-นามสกุล) เอาไว้ทำ Dropdown
export const getAgentsList = async (req: Request, res: Response) => {
    try {
        // เลือกเอาแค่ _id, first_name, last_name พอ (ไม่เอา password)
        const agents = await AgentModel.find({}).select('first_name last_name');
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch agents" });
    }
};