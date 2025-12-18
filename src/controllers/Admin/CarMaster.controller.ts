import { Request, Response } from 'express';
import CarMasterModel from '../../models/CarMaster.model';
import * as XLSX from 'xlsx';

// ✅ ฟังก์ชันช่วยแปลงข้อความให้สวยงาม (Helper Function)
// Input: "TOYOTA yaris" -> Output: "Toyota Yaris"
const formatText = (text: string): string => {
    if (!text) return "";
    return text
        .trim() // ตัดช่องว่างหน้าหลัง
        .toLowerCase() // แปลงเป็นตัวเล็กให้หมดก่อน
        .replace(/\b\w/g, char => char.toUpperCase()); // จับตัวแรกของทุกคำ มาทำเป็นตัวใหญ่
};

// ==========================================
// Part 1: APIs สำหรับ Dropdown หน้าบ้าน
// ==========================================

export const getYears = async (req: Request, res: Response) => {
    try {
        const years = await CarMasterModel.distinct('year');
        years.sort((a, b) => b - a);
        res.status(200).json(years);
    } catch (error) {
        res.status(500).json({ message: "Error fetching years" });
    }
};

export const getBrands = async (req: Request, res: Response) => {
    try {
        const { year } = req.query;
        const filter = year ? { year: Number(year) } : {};
        const brands = await CarMasterModel.find(filter).distinct('brand');
        brands.sort();
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({ message: "Error fetching brands" });
    }
};

export const getModels = async (req: Request, res: Response) => {
    try {
        const { year, brand } = req.query;
        if (!year || !brand) return res.status(400).json({ message: "Missing params" });

        const models = await CarMasterModel.find({ 
            year: Number(year), 
            brand: String(brand) 
        }).distinct('carModel');
        
        models.sort();
        res.status(200).json(models);
    } catch (error) {
        res.status(500).json({ message: "Error fetching models" });
    }
};

export const getSubModels = async (req: Request, res: Response) => {
    try {
        const { year, brand, model } = req.query; 
        
        if (!year || !brand || !model) return res.status(400).json({ message: "Missing params" });

        const cars = await CarMasterModel.find({
            year: Number(year),
            brand: String(brand),
            carModel: String(model)
        }).select('_id subModel');

        res.status(200).json(cars);
    } catch (error) {
        res.status(500).json({ message: "Error fetching sub-models" });
    }
};

// ==========================================
// Part 2: APIs สำหรับ Admin (Import Data)
// ==========================================

// 2.1 Smart Bulk Insert
export const createBulk = async (req: Request, res: Response) => {
    try {
        let { brand, carModel, start_year, end_year, sub_models } = req.body;

        // 🛡️ Data Normalization: จัดระเบียบข้อมูลก่อน
        brand = formatText(brand);       
        carModel = formatText(carModel); 
        
        // สำหรับ SubModel (Array) แค่ trim พอ (ไม่ต้อง Title Case เพราะรุ่นย่อยมีชื่อเฉพาะเยอะ เช่น e:HEV)
        const formattedSubModels = (Array.isArray(sub_models) ? sub_models : [sub_models])
            .map((sub: string) => sub.trim());

        if (!brand || !carModel || !formattedSubModels || formattedSubModels.length === 0) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
        }

        const carsToInsert = [];
        
        for (let year = parseInt(start_year); year <= parseInt(end_year); year++) {
            for (const sub of formattedSubModels) {
                carsToInsert.push({
                    brand,
                    carModel,
                    year,
                    subModel: sub 
                });
            }
        }

        const result = await CarMasterModel.insertMany(carsToInsert, { ordered: false })
            .catch(err => {
                if (err.code === 11000) return err.result || { length: "บางส่วน (ซ้ำ)" };
                throw err;
            });

        res.status(201).json({ 
            message: `เพิ่มข้อมูลสำเร็จ!`, 
            count: result?.length || carsToInsert.length 
        });

    } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
    }
};

// 2.2 Excel Import
export const importExcel = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์ Excel" });

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet) as any[];

        const carsToInsert = rawData.map(row => {
            // ดึงค่าดิบ
            const rawBrand = row['brand'] || row['Brand'] || row['ยี่ห้อ'];
            const rawModel = row['model'] || row['Model'] || row['carModel'] || row['รุ่น'];
            const rawSub = row['sub_model'] || row['subModel'] || row['SubModel'] || row['รุ่นย่อย'];
            
            return {
                brand: formatText(rawBrand),    // ✅ จัดระเบียบ Brand
                carModel: formatText(rawModel), // ✅ จัดระเบียบ Model
                subModel: rawSub ? String(rawSub).trim() : null, // รุ่นย่อยแค่ trim
                year: row['year'] || row['Year'] || row['ปี']
            };
        }).filter(car => car.brand && car.carModel && car.year);

        const result = await CarMasterModel.insertMany(carsToInsert, { ordered: false })
            .catch(err => {
                if (err.code === 11000) return err.result;
                throw err;
            });

        res.status(201).json({ 
            message: `Import สำเร็จ!`,
            data: result 
        });

    } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: "Import ล้มเหลว", error: err.message });
    }
};




// ==========================================
// Part 3: APIs สำหรับ Admin (Manage Data: Search, Edit, Delete)
// ==========================================

// 3.1 🔍 ดูข้อมูลทั้งหมด + Search 4 ช่อง + Year Range
export const getCarMasters = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, brand, carModel, subModel, year_range } = req.query;
        
        // ❌ เอา isActive ออก เพราะเราจะดึงข้อมูลทั้งหมดที่มีอยู่จริง
        const query: any = {}; 

        // --- Smart Filter ---
        if (brand) query.brand = { $regex: brand, $options: 'i' };
        if (carModel) query.carModel = { $regex: carModel, $options: 'i' };
        if (subModel) query.subModel = { $regex: subModel, $options: 'i' };

        // --- Year Range Filter ---
        if (year_range) {
            const rangeParts = String(year_range).split('-');
            if (rangeParts.length === 2) {
                query.year = { 
                    $gte: Number(rangeParts[0]), 
                    $lte: Number(rangeParts[1]) 
                };
            } else {
                query.year = Number(year_range);
            }
        }

        const skip = (Number(page) - 1) * Number(limit);
        
        const [cars, total] = await Promise.all([
            CarMasterModel.find(query)
                .sort({ year: -1, brand: 1, carModel: 1 })
                .skip(skip)
                .limit(Number(limit)),
            CarMasterModel.countDocuments(query)
        ]);

        res.status(200).json({
            data: cars,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });

    } catch (error: any) {
        res.status(500).json({ message: "Error fetching data", error: error.message });
    }
};

// 3.2 ✏️ แก้ไขข้อมูล (Duplicate Check Only)
export const updateCarMaster = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        let { brand, carModel, subModel, year } = req.body;

        // Normalize Data
        if (brand) brand = formatText(brand);
        if (carModel) carModel = formatText(carModel);
        if (subModel) subModel = subModel.trim();

        const updatedCar = await CarMasterModel.findByIdAndUpdate(
            id,
            { brand, carModel, subModel, year },
            { new: true, runValidators: true }
        );

        if (!updatedCar) return res.status(404).json({ message: "ไม่พบข้อมูล" });

        res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: updatedCar });

    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "แก้ไขล้มเหลว: ข้อมูลนี้มีอยู่ในระบบแล้ว (ซ้ำ)" });
        }
        res.status(500).json({ message: "Error updating data", error: error.message });
    }
};

// 3.3 🗑️ ลบข้อมูล (Hard Delete - ลบหายไปเลย)
export const deleteCarMaster = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // ✅ เปลี่ยนเป็น findByIdAndDelete (ลบถาวร)
        // ไม่ต้องใช้ isActive แล้ว ตรงใจเพื่อนแน่นอนครับ
        const deletedCar = await CarMasterModel.findByIdAndDelete(id);

        if (!deletedCar) return res.status(404).json({ message: "ไม่พบข้อมูล" });

        res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });

    } catch (error: any) {
        res.status(500).json({ message: "Error deleting data", error: error.message });
    }
};