import { Request, Response } from "express";
import CarInsuranceRate, {CarInsuranceRateOop} from "../models/CarInsuranceRate.model";

interface PlanQuery {
  carBrand?: string;
  level?: string;
  insuranceBrand?: string;
  year?: number;
  model?: string;
  subModel?: string;
}

export const getPlans = async (req: Request, res: Response) => {
  try {
    const { brand, model, variant, year, level } = req.query;

    const query: PlanQuery = {};

    if (typeof brand === "string") {
      query.carBrand = brand;
    }

    if (typeof model === "string") {
      query.model = model;
    }

    if (typeof variant === "string") {
      query.subModel = variant;
    }

    if (typeof year === "string" && !isNaN(Number(year))) {
      query.year = Number(year);
    }

    // ✅ ใส่เฉพาะกรณีที่เลือกจริง
    if (typeof level === "string" && level !== "ไม่ระบุ") {
      query.level = level;
    }

    const plans = await CarInsuranceRate.find(query).lean();

    res.status(200).json(plans);
  } catch (error) {
    console.error("getPlans error:", error);
    res.status(500).json({ message: "Failed to fetch insurance plans" });
  }
};

//////////////////////////////////// ADMIN //////////////////////////////////////

export const getInsuranceRateById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const rate = await CarInsuranceRate.findById(id);

        if (!rate) {
            return res.status(404).json({ success: false, message: `Insurance rate not found with ID: ${id}` });
        }

        res.status(200).json({
            success: true,
            data: rate,
        });

    } catch (error: any) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format: ${id}` });
        }
        res.status(500).json({ success: false, message: 'Server error while fetching data' });
    }
};

export const getAllInsurances = async (req: Request, res: Response) => {
    try {
        const { keyword } = req.query;
        
        // 1. รับค่า page และ limit (ถ้าไม่ส่งมา ให้ตั้งค่า Default)
        const page = parseInt(req.query.page as string) || 1;      // หน้าปัจจุบัน (เริ่มที่ 1)
        const limit = parseInt(req.query.limit as string) || 20;   // จำนวนต่อหน้า (เช่น 20 รายการ)
        const skip = (page - 1) * limit;                           // สูตรคำนวณจำนวนที่ต้องข้าม

        let query: any = {};
        
        if (keyword) {
            const regex = new RegExp(keyword as string, 'i');
            query = {
                $or: [
                    { carBrand: regex },
                    { carModel: regex },
                    { insuranceBrand: regex },
                    { level: regex }
                ]
            };
        }

        // 2. Query ข้อมูลแบบแบ่งหน้า (ใช้ .skip และ .limit)
        const insurances = await CarInsuranceRate.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)   // ข้ามข้อมูลของหน้าก่อนหน้า
            .limit(limit); // ดึงมาเท่าจำนวน limit

        // 3. นับจำนวนทั้งหมด (เพื่อให้ Frontend รู้ว่ามีกี่หน้า)
        const totalDocs = await CarInsuranceRate.countDocuments(query);

        res.status(200).json({
            success: true,
            count: insurances.length,
            // ส่งข้อมูล Pagination กลับไปให้ Frontend
            pagination: {
                total: totalDocs,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalDocs / limit)
            },
            data: insurances
        });

    } catch (error) {
        console.error('Error fetching all insurances:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching insurances' });
    }
};

export const addInsurance = async (req: Request, res: Response) => {
  console.log('test add');
  
  try {
      const newData = new CarInsuranceRate(req.body); 
      const saved = await newData.save();
      res.status(201).json({ success: true, message: "Insurance data added successfully", data: saved });
  } catch (err: any) {
      console.error('Error adding insurance rate:', err);
      if (err.name === 'ValidationError') {
          const messages = Object.values(err.errors).map((val: any) => val.message);
          return res.status(400).json({ success: false, message: messages.join(', ') });
      }
      res.status(500).json({ success: false, message: 'Server error during add operation' });
  }
};

export const updateInsuranceRate = async (req: Request, res: Response) => {
    // 1. ดึง _id จาก URL Parameters
    // ใน Express: req.params.id (ต้องตั้งค่า Route เป็น /api/admin/insurance/:id)
    const { id } = req.params;
    
    // 2. ดึงข้อมูลที่ต้องการอัปเดตจาก Request Body
    const updateFields: CarInsuranceRateOop = req.body;
    
    // 3. ป้องกันการอัปเดต ID (Optional แต่แนะนำ)
    if ('_id' in updateFields) {
        delete updateFields._id;
    }

    // 4. ตรวจสอบความถูกต้องของ ID (ถ้าเป็นไปได้)
    if (!id) {
        return res.status(400).json({ success: false, message: 'Missing insurance rate ID' });
    }

    try {
        // 5. ใช้ Mongoose findByIdAndUpdate เพื่อค้นหาและอัปเดต
        // { new: true } -> คืนค่า Document ที่ถูกอัปเดตแล้ว
        // { runValidators: true } -> รัน Mongoose Validators ก่อนบันทึก
        const updatedRate = await CarInsuranceRate.findByIdAndUpdate(
            id, // MongoDB _id
            { $set: updateFields }, // ใช้ $set เพื่ออัปเดตเฉพาะฟิลด์ที่ระบุ
            { new: true, runValidators: true }
        );

        // 6. ตรวจสอบว่ามีการค้นหาและอัปเดต Document ได้หรือไม่
        if (!updatedRate) {
            // Document ไม่พบ
            return res.status(404).json({ success: false, message: `Insurance rate not found with ID: ${id}` });
        }

        // 7. ส่งข้อมูลที่อัปเดตกลับไปให้ Frontend
        res.status(200).json({
            success: true,
            message: 'Insurance rate updated successfully',
            data: updatedRate,
        });

    } catch (error: any) {
        // 8. จัดการกับ Error ที่เกิดขึ้นระหว่างการประมวลผล (เช่น Validation Error)
        console.error('Error updating insurance rate:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val: any) => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }

        res.status(500).json({ success: false, message: 'Server error during update' });
    }
};



export const deleteInsuranceRate = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Missing insurance rate ID' });
    }

    try {
        // ใช้ Mongoose findByIdAndDelete เพื่อลบ Document
        const deletedRate = await CarInsuranceRate.findByIdAndDelete(id);

        // ตรวจสอบว่า Document ถูกลบไปหรือไม่
        if (!deletedRate) {
            // Document ไม่พบ (อาจถูกลบไปแล้ว)
            return res.status(404).json({ success: false, message: `Insurance rate not found with ID: ${id}` });
        }

        // ลบสำเร็จ
        res.status(200).json({
            success: true,
            message: 'Insurance rate deleted successfully',
            data: {}, // ส่งข้อมูลว่างเปล่ากลับไป
        });

    } catch (error: any) {
        console.error('Error deleting insurance rate:', error);

        // จัดการ Error กรณี ID ไม่ถูกต้องตามรูปแบบ MongoDB (CastError)
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format: ${id}` });
        }
        
        res.status(500).json({ success: false, message: 'Server error during delete operation' });
    }
};