import express from 'express';
// Import ฟังก์ชันใหม่มาด้วย
import { getDashboardStats, getExportData } from '../../controllers/Admin/Dashboard.controller';

const router = express.Router();

// Route เดิม (สำหรับหน้า Dashboard)
router.get('/', getDashboardStats);

// ✅ Route ใหม่ (สำหรับ Export Excel แบบ Unlimited)
// URL: http://localhost:5000/admin/dashboard/export
router.get('/export', getExportData);

export default router;