import { Router } from 'express'
// รวมเอาฟังก์ชันทั้งหมดมาไว้ด้วยกัน
import { createAgent, loginAgent, getAgentByLicense, getAgentById } from '../controllers/Agent.controller'

const router = Router();
import { authenticateJWT } from '../middlewares/authMiddleware';

router.post('/register', createAgent)

router.post('/login', loginAgent)

// เก็บไว้ทั้งสอง Route
router.get("/by-license/:license", getAgentByLicense);
router.get('/:id', getAgentById)

export default router;