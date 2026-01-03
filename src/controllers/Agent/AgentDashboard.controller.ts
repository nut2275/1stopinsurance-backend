import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseModel from "../../models/Purchase.model"; 

export const getAgentCustomerStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Agent ID format" });
    }

    const agentId = new mongoose.Types.ObjectId(id);

    // --- Prepare Match Stages ---
    
    // 1. Match สำหรับยอดขาย (ต้องมี start_date + สถานะ active/expired)
    const salesDateMatch: any = {
        agent_id: agentId,
        status: { $in: ['active', 'about_to_expire', 'expired'] }, 
        start_date: { $ne: null } 
    };

    if (startDate && endDate) {
        salesDateMatch.start_date = { 
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
        };
    }

    // 2. Match สำหรับงานทั้งหมด (ไม่สนวันที่)
    const allTasksMatch = {
        agent_id: agentId
    };

    // 3. Match สำหรับรายการต่ออายุ (30-60 วันข้างหน้า)
    const today = new Date();
    const next60Days = new Date();
    next60Days.setDate(today.getDate() + 60);


    // 🔥🔥🔥 เริ่มเทคนิค Parallel Execution (ยิง 7 Query พร้อมกัน) 🔥🔥🔥
    const [
        summaryStats,
        salesTrend,
        topCustomers,
        renewingCustomers, // 👈 ตัวนี้ตัวดี ต้องแก้
        brandPreference,
        levelStats,
        statusStats
    ] = await Promise.all([
        
        // 1. Summary Stats
        PurchaseModel.aggregate([
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
        ]),

        // 2. Sales Trend
        PurchaseModel.aggregate([
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
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$start_date" } }, 
                    sales: { $sum: "$insurance.premium" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // 3. Top Customers
        PurchaseModel.aggregate([
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
        ]),

        // 4. Renewing Customers (แก้หนักตรงนี้ ✂️ ตัดรูปออก)
        PurchaseModel.find({ 
            agent_id: agentId, 
            status: { $in: ['active', 'about_to_expire'] },
            end_date: { 
                $gte: today, 
                $lte: next60Days 
            }
        })
        // ✂️ ตัดรูปก้อนยักษ์ออกด่วน! (ถ้าไม่ตัดตรงนี้ 30 วิแน่นอน)
        .select("-citizenCardImage -carRegistrationImage -paymentSlipImage -policyFile -installmentDocImage -consentFormImage")
        .populate('customer_id', 'first_name last_name phone imgProfile_customer')
        .populate('car_id', 'registration brand carModel')
        .sort({ end_date: 1 })
        .limit(10)
        .lean(), // ⚡ ใช้ lean() เพื่อลดภาระ CPU

        // 5. Brand Preference
        PurchaseModel.aggregate([
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
        ]),

        // 6. Level Stats
        PurchaseModel.aggregate([
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
        ]),

        // 7. Status Stats
        PurchaseModel.aggregate([
            { $match: allTasksMatch }, 
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    // จัดการข้อมูล Summary (เพราะ aggregate คืนค่าเป็น array)
    const summary = summaryStats[0] || { totalRevenue: 0, totalPolicies: 0 };

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