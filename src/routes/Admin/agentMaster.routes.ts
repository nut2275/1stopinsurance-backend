import express from 'express';
import { 
    getAllAgentsMaster, 
    verifyAgentMaster,
    getAgentDetailMaster,
    updateAgentInfoMaster
} from '../../controllers/Admin/AgentMaster.controller';
// import { verifyToken, verifyAdmin } from '../../middlewares/authMiddleware'; // ถ้ามี Middleware เช็ค Admin ให้ใส่ตรงนี้

const router = express.Router();

// Base Path จะถูกกำหนดที่ server.ts (เช่น /api/admin/agents)

// GET: ดึงทั้งหมด (รองรับ ?status=...)
// ควรใส่ Middleware เช็ค Admin ด้วย เช่น router.get('/', verifyToken, verifyAdmin, getAllAgentsMaster);
router.get('/', getAllAgentsMaster); 

// GET: ดูรายคน
router.get('/:id', getAgentDetailMaster);

// PUT: อนุมัติ/ปฏิเสธ
router.put('/verify/:id', verifyAgentMaster);

// PUT: Admin แก้ไขข้อมูลส่วนตัว
router.put('/update/:id', updateAgentInfoMaster);


export default router;