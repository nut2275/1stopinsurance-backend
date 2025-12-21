import { Router } from 'express'
// รวมเอาฟังก์ชันทั้งหมดมาไว้ด้วยกัน
import { createAgent, loginAgent, updateAgent,
    getAgentById, searchAgents 
} from '../controllers/Agent.controller'

const router = Router();
import { authenticateJWT } from '../middlewares/authMiddleware';

router.post('/register', createAgent)

router.post('/login', loginAgent)
router.put('/:id', updateAgent); // แบบยังไม่เช็ค Token
// เก็บไว้ทั้งสอง Route
router.get("/search", searchAgents);
router.get('/:id', getAgentById)

export default router;