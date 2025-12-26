import { Request, Response } from "express";
import mongoose, { PipelineStage } from "mongoose";
import PurchaseModel from "../../models/Purchase.model"; // ✅ เริ่มต้นจาก Purchase

// --- 1. ดึงรายชื่อลูกค้า (Based on Purchase History) ---
export const getAgentCustomers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Agent ID
    const { search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: "Invalid Agent ID" });
        return;
    }

    const pipeline: PipelineStage[] = [
      // 1. ✅ หา Purchase ทั้งหมดที่เป็นของ Agent นี้
      { 
        $match: { 
            agent_id: new mongoose.Types.ObjectId(id) 
        } 
      },
      // 2. ✅ Group ตาม customer_id (เพื่อไม่ให้ชื่อลูกค้าซ้ำ ถ้าเขาซื้อหลายใบ)
      {
        $group: {
            _id: "$customer_id",
            lastTransactionDate: { $max: "$createdAt" } // เก็บวันที่ซื้อล่าสุดไว้เรียงลำดับ
        }
      },
      // 3. Join ไปเอาข้อมูลลูกค้า (Profile)
      {
        $lookup: {
          from: "customers", // ชื่อ Collection ใน DB (ตัวพิมพ์เล็กเติม s)
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo"
        }
      },
      { $unwind: "$customerInfo" }, // แตก Array ออกเป็น Object

      // 4. (Optional) ระบบ Search: กรองชื่อ/เบอร์ หลังจาก Join แล้ว
      ...(search ? [{
          $match: {
              $or: [
                  { "customerInfo.first_name": { $regex: search, $options: 'i' } },
                  { "customerInfo.last_name": { $regex: search, $options: 'i' } },
                  { "customerInfo.phone": { $regex: search, $options: 'i' } }
              ]
          }
      }] : []),

      // 5. Join ไปเอาข้อมูลรถ (Cars) ของลูกค้ารายนี้
      {
        $lookup: {
          from: "cars",
          localField: "_id",
          foreignField: "customer_id",
          as: "myCars"
        }
      },

      // 6. Join ไปเอาประวัติการซื้อ (History) เพื่อมานับ Active Policies
      {
        $lookup: {
            from: "purchases",
            localField: "_id",
            foreignField: "customer_id",
            as: "allPurchases"
        }
      },

      // 7. จัดรูปแบบข้อมูลสุดท้าย (Projection)
      {
        $project: {
            _id: 1, // customer_id
            first_name: "$customerInfo.first_name",
            last_name: "$customerInfo.last_name",
            phone: "$customerInfo.phone",
            email: "$customerInfo.email",
            imgProfile_customer: "$customerInfo.imgProfile_customer",
            
            // นับจำนวนรถ
            totalCars: { $size: "$myCars" },

            // นับกรมธรรม์ที่ Active
            activePolicies: {
                $size: {
                    $filter: {
                        input: "$allPurchases",
                        as: "p",
                        cond: { $eq: ["$$p.status", "active"] }
                    }
                }
            },
            
            lastPurchaseDate: "$lastTransactionDate"
        }
      },
      // เรียงคนซื้อล่าสุดขึ้นก่อน
      { $sort: { lastPurchaseDate: -1 } }
    ];

    const customers = await PurchaseModel.aggregate(pipeline);

    res.json(customers);

  } catch (error: unknown) {
    console.error("Get Customers Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
};

// --- 2. ดึงข้อมูลลูกค้า 1 คน (Customer Detail) ---
// *ฟังก์ชันนี้เหมือนเดิม เพราะใช้ customerId ดึงตรงๆ ได้เลย*
import CustomerModel from "../../models/Customer.model";
import CarModel from "../../models/Car.model";

export const getCustomerDetail = async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;

        // 1. ข้อมูลส่วนตัว
        const customer = await CustomerModel.findById(customerId);
        if(!customer) { res.status(404).json({error: "Not Found"}); return; }

        // 2. ข้อมูลรถ
        const garage = await CarModel.find({ customer_id: customerId }).sort({ createdAt: -1 });

        // 3. ประวัติการซื้อ
        const history = await PurchaseModel.find({ customer_id: customerId })
            .populate({ path: 'carInsurance_id', select: 'insuranceBrand level premium' })
            .populate({ path: 'car_id', select: 'brand registration' })
            .sort({ createdAt: -1 });

        // 4. Stats
        const totalSpent = history.reduce((sum, item: any) => sum + (item.carInsurance_id?.premium || 0), 0);

        res.json({
            profile: customer,
            garage,
            history,
            stats: {
                totalSpent,
                totalPolicies: history.length,
                activePolicies: history.filter(h => h.status === 'active').length
            }
        });

    } catch (error: unknown) {
        res.status(500).json({ error: (error as Error).message });
    }
}