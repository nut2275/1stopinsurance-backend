import { Router } from 'express'
// รวมเอาฟังก์ชันทั้งหมดมาไว้ด้วยกัน
import { createAgent, loginAgent, updateAgent,
    getAgentById, searchAgents 
} from '../controllers/Agent.controller'

import { getAgentCustomers, getCustomerDetail }  from '../controllers/Agent/AgentCustomer.controller'

const router = Router();

router.post('/register', createAgent)

router.post('/login', loginAgent)
router.put('/:id', updateAgent); // แบบยังไม่เช็ค Token
// เก็บไว้ทั้งสอง Route
router.get("/search", searchAgents);
router.get('/:id', getAgentById)


// 1. ดึงรายชื่อลูกค้าทั้งหมดของ Agent (สำหรับหน้า Table)
// URL: /agent/my-customers/:id?search=...
router.get('/my-customers/:id', getAgentCustomers);

// 2. ดึงข้อมูลลูกค้า 1 คน แบบละเอียด (สำหรับหน้า Profile)
// URL: /agent/customer-profile/:customerId
router.get('/customer-profile/:customerId', getCustomerDetail);

export default router;