import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import PurchaseModel, { PurchaseDocument } from "../../models/Purchase.model";

// Interface สำหรับ Query Params
interface DashboardQueryParams {
    startDate?: string;
    endDate?: string;
}


// 1. ฟังก์ชันสำหรับหน้า Dashboard
// 1. ฟังก์ชันสำหรับหน้า Dashboard (Optimized Version 🚀)
export const getDashboardStats = async (req: Request<{}, {}, {}, DashboardQueryParams>, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // --- Filter Logic (เหมือนเดิม) ---
    const successfulSalesMatch: FilterQuery<PurchaseDocument> = {
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        start_date: { $ne: null } 
    };

    if (startDate && endDate) {
        successfulSalesMatch.start_date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    // --- Date Format Logic (เหมือนเดิม) ---
    let dateFormat = "%Y-%m"; 
    if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        if (diffDays <= 90) dateFormat = "%Y-%m-%d";
        else if (diffDays <= 365 * 5) dateFormat = "%Y-%U";
    }

    // 🔥 เทคนิค Promise.all: ยิง Database 7 คำสั่งพร้อมกัน! 🔥
    const [
        summaryStats,
        salesTrend,
        topAgents,
        brandPreference,
        levelStats,
        statusStats,
        recentTransactions
    ] = await Promise.all([
        // 1. Summary
        PurchaseModel.aggregate([
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
        ]),

        // 2. Sales Trend
        PurchaseModel.aggregate([
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
                    _id: { $dateToString: { format: dateFormat, date: "$start_date" } }, 
                    sales: { $sum: "$insurance.premium" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // 3. Top Agents
        PurchaseModel.aggregate([
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
        ]),

        // 4. Brand Preference
        PurchaseModel.aggregate([
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
        ]),

        // 5. Level Stats
        PurchaseModel.aggregate([
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
        ]),

        // 6. Status Stats
        PurchaseModel.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]),

        // 7. Recent Transactions
        PurchaseModel.find({
            status: { $in: ['active', 'about_to_expire', 'expired'] },
        })
        .select("-citizenCardImage -carRegistrationImage -paymentSlipImage -policyFile -installmentDocImage -consentFormImage")
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('agent_id', 'first_name last_name imgProfile')
        .populate('customer_id', 'first_name last_name')
        .populate({
            path: 'carInsurance_id',
            select: 'insuranceBrand premium'
        })
        .lean() // 🔥 เพิ่ม .lean() ตรงนี้! แปลงเป็น JSON ธรรมดา ลดภาระ CPU
    ]);

    // จัดรูปแบบข้อมูลก่อนส่งกลับ (เพื่อให้ตรงกับ Interface Frontend)
    const summary = summaryStats[0] || { totalRevenue: 0, totalPolicies: 0, activeAgentsCount: 0 };

    res.json({
      summary,
      salesTrend,
      topAgents,
      brandPreference,
      levelStats,
      statusStats,
      recentTransactions
    });

  } catch (error: unknown) {
    console.error("Admin Dashboard Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
};


// ✅ 2. Export Data (แก้ให้ตรง Logic)
export const getExportData = async (req: Request<{}, {}, {}, DashboardQueryParams>, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // ✅ แก้ไข: ใช้ start_date ในการกรอง Export
    const filter: FilterQuery<PurchaseDocument> = {
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        start_date: { $ne: null }
    };

    if (startDate && endDate) {
        filter.start_date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const allTransactions = await PurchaseModel.find(filter)
    //ไม่ดึงข้อมูลรูปภาพหนักๆ
    .select("-citizenCardImage -carRegistrationImage -paymentSlipImage -policyFile -installmentDocImage -consentFormImage")
    .sort({ start_date: -1 }) // เรียงตามวันคุ้มครอง
    .populate('agent_id', 'first_name last_name')
    .populate('customer_id', 'first_name last_name')
    .populate('carInsurance_id', 'insuranceBrand premium level policy_number');

    res.json(allTransactions);

  } catch (error: unknown) {
    console.error("Export Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
};