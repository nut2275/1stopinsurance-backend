import { Request, Response } from 'express';
import AgentModel from '../../models/Agent.model'; // เช็ค Path ให้ถูกนะครับ
import bcrypt from 'bcryptjs';


// 1. ดึงข้อมูล Agent ทั้งหมด (รองรับ Filter Status ถ้าส่ง query มา)
export const getAllAgentsMaster = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query = { verification_status: status };
        }

        // ดึงข้อมูลทั้งหมด เรียงจากใหม่ไปเก่า
        const agents = await AgentModel.find(query)
            .select('-password') // ไม่เอา Password
            .sort({ createdAt: -1 });

        res.status(200).json(agents);
    } catch (err) {
        const error = err as Error;
        console.error("AgentMaster GetAll Error:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// 2. อนุมัติ หรือ ปฏิเสธ (Verify Agent)
export const verifyAgentMaster = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        if (!['approved', 'rejected', 'in_review'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updatedAgent = await AgentModel.findByIdAndUpdate(
            id,
            { 
                verification_status: status,
                note: note // บันทึกหมายเหตุ (เช่น เหตุผลที่ปฏิเสธ)
            },
            { new: true }
        ).select('-password');

        if (!updatedAgent) {
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json({ message: `Status updated to ${status}`, data: updatedAgent });

    } catch (err) {
        const error = err as Error;
        console.error("AgentMaster Verify Error:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

// 3. (แถม) ดึงข้อมูล Detail เชิงลึกสำหรับ Admin ดู
export const getAgentDetailMaster = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const agent = await AgentModel.findById(id).select('-password');
        
        if (!agent) {
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json(agent);
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// ✅ 4. Admin แก้ไขข้อมูลส่วนตัว Agent (ไม่รวม Password)
export const updateAgentInfoMaster = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // ดึงค่าจาก Body
        const { 
            first_name, last_name, phone, idLine, 
            address, agent_license_number, card_expiry_date, 
            birth_date, note, verification_status,
            password // ✅ รับ password มาด้วย
        } = req.body;

        // เตรียมข้อมูลที่จะ Update
        let updateData: any = {
            first_name, last_name, phone, idLine,
            address, agent_license_number, note,
            verification_status,
            card_expiry_date: card_expiry_date ? new Date(card_expiry_date) : undefined,
            birth_date: birth_date ? new Date(birth_date) : undefined,
        };

        // ✅ Logic: ถ้ามีการส่ง password มาใหม่ ให้ Hash ก่อนบันทึก
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateData.password = hashedPassword; // เพิ่ม field password ที่ hash แล้วเข้าไป
        }

        const updatedAgent = await AgentModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password'); // ยังคงไม่ส่ง password กลับไปหน้าบ้าน

        if (!updatedAgent) {
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json({ message: "Update successful", data: updatedAgent });

    } catch (err) {
        const error = err as Error;
        console.error("AgentMaster Update Error:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};