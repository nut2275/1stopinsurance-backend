import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import PurchaseModel, { PurchaseDocument } from "../../models/Purchase.model";

// Interface สำหรับ Query Params
interface DashboardQueryParams {
    startDate?: string;
    endDate?: string;
}

// 1. ฟังก์ชันสำหรับหน้า Dashboard
export const getDashboardStats = async (req: Request<{}, {}, {}, DashboardQueryParams>, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // --- Filter Logic ---
    // ใช้ FilterQuery จาก Mongoose เพื่อ Type Check เงื่อนไข
    const dateFilter: FilterQuery<PurchaseDocument> = {};
    let isViewAll = true; 

    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
        isViewAll = false;
    }

    const successfulSalesMatch: FilterQuery<PurchaseDocument> = {
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        ...dateFilter
    };

    // --- Aggregations ---

    // 1. Summary
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

    // 2. Sales Trend
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
                _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
                sales: { $sum: "$insurance.premium" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // 3. Top Agents
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

    // 6. Status Stats
    const statusStats = await PurchaseModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 7. Recent Transactions (Limit 10)
    const recentTransactions = await PurchaseModel.find({
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        ...dateFilter
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

// ✅ 2. ฟังก์ชันใหม่: สำหรับ Export ข้อมูลดิบทั้งหมด (Unlimited)
export const getExportData = async (req: Request<{}, {}, {}, DashboardQueryParams>, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: FilterQuery<PurchaseDocument> = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const allTransactions = await PurchaseModel.find({
        status: { $in: ['active', 'about_to_expire', 'expired'] },
        ...dateFilter
    })
    .sort({ createdAt: -1 })
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