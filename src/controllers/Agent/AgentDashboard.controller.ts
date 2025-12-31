import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseModel from "../../models/Purchase.model"; 

export const getAgentCustomerStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // รับค่า startDate และ endDate จาก Query String
    const { startDate, endDate } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Agent ID format" });
    }

    const agentId = new mongoose.Types.ObjectId(id);

    // ----------------------------------------------------
    // ✅ 1. แก้ไข Logic Sales Trend (กราฟยอดขาย)
    // เปลี่ยนจากดู createdAt เป็น start_date (วันเริ่มคุ้มครอง)
    // ----------------------------------------------------

    // สร้างเงื่อนไขการกรองวันที่สำหรับยอดขาย
    const salesDateMatch: any = {
        agent_id: agentId,
        // เอาเฉพาะสถานะที่ถือว่า "ขายได้แล้ว"
        status: { $in: ['active', 'about_to_expire', 'expired'] }, 
        // ต้องมีวันเริ่มคุ้มครอง (กันเหนียว)
        start_date: { $ne: null } 
    };

    // ถ้ามีการส่งตัวกรองวันที่มา ให้กรองจาก start_date
    if (startDate && endDate) {
        salesDateMatch.start_date = { 
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }

    // ----------------------------------------------------
    // ✅ 2. เตรียม Logic งานปัจจุบัน (Operational Tasks)
    // ไม่ต้องกรองวันที่ เพราะต้องเห็นงานค้างทั้งหมด
    // ----------------------------------------------------
    const allTasksMatch = {
        agent_id: agentId
    };


    // --- 3. เริ่มดึงข้อมูล (Aggregations) ---

    // 1. Summary Stats (ยอดขายรวม)
    // แก้ให้ใช้ salesDateMatch (อิง start_date)
    const summaryStats = await PurchaseModel.aggregate([
      { $match: salesDateMatch },
      {
        $lookup: {
          from: 'carinsurancerates',
          localField: 'carInsurance_id',
          foreignField: '_id',
          as: 'insurance'
        }
      },
      { $unwind: "$insurance" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$insurance.premium" },
          totalPolicies: { $sum: 1 }
        }
      }
    ]);
    const summary = summaryStats[0] || { totalRevenue: 0, totalPolicies: 0 };

    // 2. Sales Trend (แนวโน้มยอดขายรายวัน)
    // ✅ แก้ Group เป็น $start_date
    const salesTrend = await PurchaseModel.aggregate([
        { $match: salesDateMatch },
        {
            $lookup: {
                from: 'carinsurancerates',
                localField: 'carInsurance_id',
                foreignField: '_id',
                as: 'insurance'
            }
        },
        { $unwind: "$insurance" },
        {
            $group: {
                // Group ตามวันเริ่มคุ้มครอง
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$start_date" } }, 
                sales: { $sum: "$insurance.premium" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // 3. Top Customers (ลูกค้า Top Spender)
    // ใช้ salesDateMatch เพื่อให้สอดคล้องกับยอดขาย
    const topCustomers = await PurchaseModel.aggregate([
      { $match: salesDateMatch },
      {
        $lookup: {
          from: 'carinsurancerates',
          localField: 'carInsurance_id',
          foreignField: '_id',
          as: 'insurance'
        }
      },
      { $unwind: "$insurance" },
      {
        $group: {
          _id: "$customer_id",
          totalSpent: { $sum: "$insurance.premium" },
          policiesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: "$customerInfo" },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: { $concat: ["$customerInfo.first_name", " ", "$customerInfo.last_name"] },
          phone: "$customerInfo.phone",
          imgProfile: "$customerInfo.imgProfile_customer",
          totalSpent: 1,
          policiesCount: 1
        }
      }
    ]);

    // ----------------------------------------------------
    // ✅ 4. Renewing Customers (แจ้งเตือนต่ออายุ)
    // แก้ไข: ไม่สนสถานะ about_to_expire แต่ดู active + วันหมดอายุใกล้ถึงแทน
    // ----------------------------------------------------
    
    const today = new Date();
    const next60Days = new Date();
    next60Days.setDate(today.getDate() + 60); // แจ้งเตือนล่วงหน้า 60 วัน

    const renewingCustomers = await PurchaseModel.find({ 
        agent_id: agentId, 
        // เงื่อนไข: ต้องเป็น Active หรือ About to expire
        status: { $in: ['active', 'about_to_expire'] },
        // เงื่อนไข: วันหมดอายุต้องอยู่ในช่วง วันนี้ ถึง 60 วันข้างหน้า
        end_date: { 
            $gte: today, 
            $lte: next60Days 
        }
    })
    .populate('customer_id', 'first_name last_name phone imgProfile_customer')
    .populate('car_id', 'registration brand carModel')
    .sort({ end_date: 1 }) // เรียงวันหมดอายุที่ใกล้สุดขึ้นก่อน
    .limit(10);

    // 5. Brand Preference
    const brandPreference = await PurchaseModel.aggregate([
      { $match: salesDateMatch }, 
      {
        $lookup: {
          from: 'carinsurancerates',
          localField: 'carInsurance_id',
          foreignField: '_id',
          as: 'insurance'
        }
      },
      { $unwind: "$insurance" },
      {
        $group: {
          _id: "$insurance.insuranceBrand",
          count: { $sum: 1 }
        }
      }
    ]);

    // 6. Level Stats (ยอดขายแยกตามชั้น)
    const levelStats = await PurchaseModel.aggregate([
      { $match: salesDateMatch },
      {
        $lookup: {
          from: 'carinsurancerates',
          localField: 'carInsurance_id',
          foreignField: '_id',
          as: 'insurance'
        }
      },
      { $unwind: "$insurance" },
      {
        $group: {
          _id: "$insurance.level",
          count: { $sum: 1 },
          totalSales: { $sum: "$insurance.premium" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 7. Status Stats (สถานะงานปัจจุบัน - Task Summary)
    // ✅ ใช้ allTasksMatch (ไม่กรองวันที่) เพราะต้องแสดงงานค้างทั้งหมด
    const statusStats = await PurchaseModel.aggregate([
      { $match: allTasksMatch }, 
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary,          
      salesTrend,
      topCustomers,
      renewingCustomers,
      brandPreference,
      levelStats,       
      statusStats       
    });

  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};