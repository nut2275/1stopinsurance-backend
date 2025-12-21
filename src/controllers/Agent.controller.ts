import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import  AgentModel, {Agent} from '../models/Agent.model';
import {AuthRequest} from '../middlewares/authMiddleware'
import { ROLES } from '../interfaces/type';



// if (!process.env.JWT_SECRET) {
//   throw new Error('❌ Missing JWT_SECRET environment variable');
// }
const JWT_SECRET = process.env.JWT_SECRET || '92680bcc59e60c4753ce03a8e6efb1bc';

export const createAgent = async(req:Request, res:Response) => {
    // console.log("create Agent");
    
    try {
        const {
            first_name, last_name, agent_license_number, card_expiry_date,
            address, imgProfile, idLine, phone, note, username, password,
            birth_date
        } = req.body

        const checkUsername = await AgentModel.findOne({username:username});
        if(checkUsername) {
            return res.status(400).json({message: "Username already exists"})
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAgent = new AgentModel({
            first_name, last_name, 
            agent_license_number,
            card_expiry_date: new Date(card_expiry_date),
            address, imgProfile, idLine, phone, note, username, 
            password:hashedPassword,
            birth_date: new Date(birth_date)
        })
        
        await newAgent.save();
        // console.log("create Agent succes")
        res.status(201).json({message: "Agent created successfully",newAgent})

    }catch (err) {
        // console.log("create Agent fail")
        const error = err as Error;
        res.status(500).json({ message: "Create agent failed", error: error.message });
    }
}

export const loginAgent = async(req:Request, res:Response) => {
    try{
        const {username, password} = req.body
        const agent = await AgentModel.findOne({username:username})
        if (!agent) {
            // return res.status(400).json({message:"Not found user"})
            return res.status(400).json({message:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
        }
        const isMatch = await bcrypt.compare(password, agent.password)
        if(!isMatch) {
            // return res.status(400).json({message:"password is false"})
            return res.status(400).json({message:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
        }

        const token = jwt.sign(
            {id:agent._id, username:agent.username, role: ROLES.AGENT},
            JWT_SECRET, { expiresIn: '30d' }
        )

        res.status(200).json({
            message:"Login Agent successful",
            token,
            Agent: {
                id:agent._id, username:agent.username, role: ROLES.AGENT
            }
        })

    }catch (err){
        const error = err as Error;
        res.status(500).json({ message: "Create agent failed", error: error.message });
    }
}

export const updateAgent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address, imgProfile, idLine, phone, note } = req.body; // รับเฉพาะฟิลด์ที่อนุญาต

    // สร้าง Object สำหรับอัปเดต (ป้องกันไม่ให้แก้ username/password/license มั่วซั่ว)
    const updateData: any = {};
    if (address) updateData.address = address;
    if (imgProfile) updateData.imgProfile = imgProfile;
    if (idLine) updateData.idLine = idLine;
    if (phone) updateData.phone = phone;
    if (note) updateData.note = note;

    // อัปเดตข้อมูล (new: true คือให้ return ข้อมูลใหม่กลับมา)
    const updatedAgent = await AgentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password'); // ไม่ส่ง password กลับไป

    if (!updatedAgent) {
      return res.status(404).json({ message: "ไม่พบข้อมูลตัวแทน" });
    }

    res.status(200).json(updatedAgent);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล", error: error.message });
  }
};

// export const getAgentByLicense = async (req: Request, res: Response) => {
//   try {
//     const { license } = req.params;

//     const agent = await AgentModel.findOne({
//       agent_license_number: license,
//     }).select("first_name last_name agent_license_number imgProfile");

//     if (!agent) {
//       return res.status(404).json({ message: "Agent not found" });
//     }

//     res.status(200).json(agent);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

//แสดง ข้อมูลติดต่อกับagent
export const getAgentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await AgentModel.findById(id).select('-password');

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.status(200).json(agent);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ message: "Error fetching agent", error: error.message });
  }
};

export const searchAgents = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "Missing query" });
    }

    const agents = await AgentModel.find({
      $or: [
        { agent_license_number: { $regex: q, $options: "i" } },
        { first_name: { $regex: q, $options: "i" } },
        { last_name: { $regex: q, $options: "i" } },
      ],
    })
      .select("first_name last_name agent_license_number imgProfile")
      .limit(10);

    res.status(200).json(agents);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};