import { Request, Response } from 'express';
import PurchaseModel from '../../models/Purchase.model';

// Admin ดูข้อมูลลูกค้าทั้งหมด
export const findAllCustomerPurchase = async (req: Request, res: Response) => {
    try {
        // 1. รับค่า Pagination และ Search จาก Frontend
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || "";

        const skip = (page - 1) * limit;

        // 2. สร้าง Pipeline สำหรับ Aggregation
        const pipeline: any[] = [];

        // --- STAGE A: Join ตาราง (Lookup) ---
        // Join กับ Customer เพื่อเอาชื่อ
        pipeline.push({
            $lookup: {
                from: "customers",
                localField: "customer_id",
                foreignField: "_id",
                as: "customer_data"
            }
        });
        pipeline.push({ $unwind: "$customer_data" });

        // Join กับ CarInsuranceRate เพื่อเอาข้อมูลประกัน
        pipeline.push({
            $lookup: {
                from: "carinsurancerates", // ชื่อ collection ใน MongoDB
                localField: "carInsurance_id",
                foreignField: "_id",
                as: "insurance_data"
            }
        });
        // ใช้ preserveNullAndEmptyArrays เพื่อกันข้อมูลหายถ้าหาประกันไม่เจอ
        pipeline.push({ 
            $unwind: { path: "$insurance_data", preserveNullAndEmptyArrays: true } 
        });

        // --- STAGE B: Search / Filter (ถ้ามีการค้นหา) ---
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "policy_number": { $regex: search, $options: 'i' } },
                        { "customer_data.first_name": { $regex: search, $options: 'i' } },
                        { "customer_data.last_name": { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        // --- STAGE C: Pagination & Counting ($facet) ---
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $sort: { createdAt: -1 } }, // เรียงจากใหม่ไปเก่า
                    { $skip: skip },
                    { $limit: limit },
                    { 
                        // ✅ ส่วนที่แก้ไข: เพิ่ม startDate และ endDate
                        $project: {
                            _id: 1,
                            policy_number: 1,
                            status: 1,
                            customer_name: { $concat: ["$customer_data.first_name", " ", "$customer_data.last_name"] },
                            
                            // ดึงชื่อบริษัทจาก insuranceBrand
                            insurance_company: "$insurance_data.insuranceBrand", 
                            
                            // ดึงประเภทประกันจาก level
                            insurance_type: "$insurance_data.level",
                            
                            // ✅ เพิ่ม 2 บรรทัดนี้ (ตรวจสอบชื่อ field ใน DB จริงด้วยนะครับว่าชื่อ startDate/endDate ไหม)
                            startDate: 1,
                            endDate: 1,

                            purchase_date: 1
                        }
                    }
                ]
            }
        });

        // 3. Execute Query
        const result = await PurchaseModel.aggregate(pipeline);

        // 4. จัด Format ข้อมูลส่งกลับ
        const data = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        return res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching all insurances:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}