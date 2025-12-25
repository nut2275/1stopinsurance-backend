import express from "express";
import { 
    getNotifications, 
    createNotification, 
    markAsRead, 
    deleteNotification,
    markAsReadBulk
} from "../controllers/Notification.Controller"; // ตรวจสอบ path

const router = express.Router();

// --- Public / General Routes ---
// GET: /api/notifications?userId=xxxx (ดึงรายการแจ้งเตือนของ User คนนั้น)
router.get("/notifications", getNotifications);

// POST: /api/notifications (สร้างการแจ้งเตือน - อาจจะใช้โดย Admin หรือ System ภายใน)
router.post("/notifications", createNotification);

// --- Specific Action Routes ---
// PUT: /api/notifications/:id/read (กดอ่านแจ้งเตือน)
router.put("/notifications/:id/read", markAsRead);

// DELETE: /api/notifications/:id (ลบแจ้งเตือน)
router.put("/notifications/read-bulk", markAsReadBulk);
router.put("/notifications/:id/read", markAsRead);

export default router;