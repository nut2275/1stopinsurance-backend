import { Request, Response } from "express";
import PurchaseModel from "../../models/Purchase.model";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // --- 1. เตรียมเงื่อนไขการกรอง (Filters) ---

    // A. ตัวกรองวันที่ (Global Date Filter)
    const dateFilter: any = {};
    // ตัวแปรเช็คว่า "ดูทั้งหมด" หรือไม่ (เพื่อปรับกราฟเป็นรายเดือน)
    let isViewAll = true; 

    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
        isViewAll = false; // มีการระบุวัน แสดงว่าไม่ใช่ View All
    }

    // B. Match Stage: สถานะ active (ยอดขายจริง) + ช่วงเวลา
    const successfulSalesMatch = {
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        ...dateFilter
    };

    // --- 2. เริ่มดึงข้อมูล (Aggregations) ---

    // 1. Global Summary (ยอดขายรวม)
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
          totalPolicies: { $sum: 1 },
          uniqueAgents: { $addToSet: "$agent_id" }
        }
      },
      {
        $project: {
            totalRevenue: 1,
            totalPolicies: 1,
            activeAgentsCount: { $size: "$uniqueAgents" }
        }
      }
    ]);
    const summary = summaryStats[0] || { totalRevenue: 0, totalPolicies: 0, activeAgentsCount: 0 };

    // 2. ✅ Smart Sales Trend (ปรับความละเอียดกราฟตามช่วงเวลา)
    // ถ้าดู "ทั้งหมด" (isViewAll) -> Group ตามเดือน (%Y-%m)
    // ถ้าดู "ช่วงสั้นๆ" -> Group ตามวัน (%Y-%m-%d)
    const dateFormat = isViewAll ? "%Y-%m" : "%Y-%m-%d";

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
                // Dynamic Format ตรงนี้ครับ
                _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
                sales: { $sum: "$insurance.premium" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } } // เรียงจากอดีต -> ปัจจุบัน
    ]);

    // 3. Top Performing Agents
    const topAgents = await PurchaseModel.aggregate([
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
                _id: "$agent_id",
                totalSales: { $sum: "$insurance.premium" },
                policiesCount: { $sum: 1 }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'agents', 
                localField: '_id',
                foreignField: '_id',
                as: 'agentInfo'
            }
        },
        { $unwind: "$agentInfo" },
        {
            $project: {
                name: { $concat: ["$agentInfo.first_name", " ", "$agentInfo.last_name"] },
                imgProfile: "$agentInfo.imgProfile", 
                totalSales: 1,
                policiesCount: 1
            }
        }
    ]);

    // 4. Brand Preference
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

    // 5. Level Stats
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

    // 6. Status Stats (อันนี้ปกติเราจะไม่กรองวันที่ เพื่อให้เห็นงานค้างทั้งหมดในระบบ)
    const statusStats = await PurchaseModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 7. ✅ Recent Transactions (เพิ่ม Filter วันที่ + สถานะ Active)
    // แก้ไข: ใส่ ...dateFilter เข้าไป เพื่อให้แสดงเฉพาะรายการในช่วงเวลานั้นๆ
    const recentTransactions = await PurchaseModel.find({
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        ...dateFilter // <--- เพิ่มตรงนี้ครับ!
    })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('agent_id', 'first_name last_name imgProfile')
        .populate('customer_id', 'first_name last_name')
        .populate({
            path: 'carInsurance_id',
            select: 'insuranceBrand premium'
        });

    res.json({
      summary,
      salesTrend, // Frontend จะได้รับเป็น รายวัน หรือ รายเดือน ตามช่วงเวลาอัตโนมัติ
      topAgents,
      brandPreference,
      levelStats,
      statusStats,
      recentTransactions
    });

  } catch (error: any) {
    console.error("Admin Dashboard Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};