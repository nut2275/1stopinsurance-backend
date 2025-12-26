import express from 'express';
// Import Controller ที่เราเพิ่งสร้าง
import { getDashboardStats } from '../../controllers/Admin/Dashboard.controller';

const router = express.Router();

// GET: /admin/dashboard
// ตอนนี้ยังเปิด Public ไว้ (อนาคตค่อยเติม verifyToken, checkAdmin)
router.get('/', getDashboardStats);

export default router;