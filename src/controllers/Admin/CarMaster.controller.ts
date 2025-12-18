import { Request, Response } from 'express';
import CarMasterModel from '../../models/CarMaster.model';
import * as XLSX from 'xlsx';

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

        // ✅ ใช้ carModel ในการค้นหาและ distinct
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
        // ✅ รับค่า model มา แต่ใน DB เราต้อง query field ชื่อ carModel
        const { year, brand, model } = req.query; 
        
        if (!year || !brand || !model) return res.status(400).json({ message: "Missing params" });

        const cars = await CarMasterModel.find({
            year: Number(year),
            brand: String(brand),
            carModel: String(model) // ✅ Map model (จาก query) -> carModel (ใน DB)
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
        // ✅ รับค่า carModel จาก Body
        const { brand, carModel, start_year, end_year, sub_models } = req.body;

        if (!brand || !carModel || !sub_models || sub_models.length === 0) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
        }

        const carsToInsert = [];
        const subs = Array.isArray(sub_models) ? sub_models : [sub_models];

        for (let year = parseInt(start_year); year <= parseInt(end_year); year++) {
            for (const sub of subs) {
                carsToInsert.push({
                    brand,
                    carModel, // ✅ ใช้ carModel
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

        const carsToInsert = rawData.map(row => ({
            brand: row['brand'] || row['Brand'] || row['ยี่ห้อ'],
            // ✅ Map จาก Excel header 'model' ไปลง DB field 'carModel'
            carModel: row['model'] || row['Model'] || row['carModel'] || row['รุ่น'],
            subModel: row['sub_model'] || row['subModel'] || row['SubModel'] || row['รุ่นย่อย'],
            year: row['year'] || row['Year'] || row['ปี']
        })).filter(car => car.brand && car.carModel && car.year);

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