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

    // --- 1. เตรียมเงื่อนไขการกรอง (Filters) ---

    // A. ตัวกรองวันที่ (ใช้กับยอดขายและกราฟวิเคราะห์)
    const dateFilter: any = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }

    // B. Match Stage สำหรับ "ยอดขายที่สำเร็จแล้ว" (Active Sales)
    // ใช้คำนวณรายได้, กราฟเส้น, และกราฟวงกลม
    const successfulSalesMatch = {
        agent_id: agentId,
        status: { $in: ['active', 'about_to_expire', 'expired'] }, // นับเฉพาะที่จ่ายเงินและอนุมัติแล้ว
        ...dateFilter // ใส่กรองวันที่
    };

    // C. Match Stage สำหรับ "งานปัจจุบัน" (Operational Tasks)
    // ไม่กรองวันที่ เพราะงานค้างคืองานค้าง ไม่ว่าจะเข้ามาเมื่อไหร่
    const allTasksMatch = {
        agent_id: agentId
    };


    // --- 2. เริ่มดึงข้อมูล (Aggregations) ---

    // 1. Summary Stats (ยอดขายรวม & จำนวนกรมธรรม์)
    const summaryStats = await PurchaseModel.aggregate([
      { $match: successfulSalesMatch },
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
    const salesTrend = await PurchaseModel.aggregate([
        { $match: successfulSalesMatch },
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
                // จัดกลุ่มตามวันที่ YYYY-MM-DD
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                sales: { $sum: "$insurance.premium" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } } // เรียงจากอดีต -> ปัจจุบัน
    ]);

    // 3. Top Customers (ลูกค้า Top Spender)
    const topCustomers = await PurchaseModel.aggregate([
      { $match: successfulSalesMatch },
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

    // 4. Renewing Customers (แจ้งเตือนต่ออายุ)
    // อันนี้ Fix สถานะ about_to_expire ไม่ต้องสน Date Filter เพราะดูอนาคต
    const renewingCustomers = await PurchaseModel.find({ 
        agent_id: agentId, 
        status: 'about_to_expire' 
    })
    .populate('customer_id', 'first_name last_name phone imgProfile_customer')
    .populate('car_id', 'registration brand carModel')
    .limit(10);

    // 5. Brand Preference (✅ แก้ไข: ใช้ successfulSalesMatch)
    // ตัดพวก Pending ทิ้ง เพื่อนับเฉพาะส่วนแบ่งการตลาดจริง
    const brandPreference = await PurchaseModel.aggregate([
      { $match: successfulSalesMatch }, 
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
      { $match: successfulSalesMatch },
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