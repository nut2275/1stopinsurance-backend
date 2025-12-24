import { Request, Response } from "express";
import Notification from "../models/Notification.model"; // ตรวจสอบ path ให้ตรงกับไฟล์ model ของคุณ

// interface สำหรับ query string (ถ้าต้องการ type safety แบบเข้มข้น)
interface NotificationQuery {
  recipientId?: string;
}

// 1. GET: ดึงรายการแจ้งเตือน (เลียนแบบ getPlans / getAllInsurances)
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query; // รับ userId มาเพื่อดึงเฉพาะของคนนั้น

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Query หา Notification ของ User คนนั้น
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 }); // เรียงใหม่สุดขึ้นก่อน

    // นับจำนวนที่ยังไม่ได้อ่าน (Unread Count)
    const unreadCount = await Notification.countDocuments({ 
        recipientId: userId, 
        isRead: false 
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: unreadCount,
      data: notifications,
    });

  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

// 2. POST: สร้างการแจ้งเตือนใหม่ (เลียนแบบ addInsurance)
export const createNotification = async (req: Request, res: Response) => {
  try {
    // req.body ควรมี { recipientId, recipientType, message, type, relatedPurchaseId }
    const newData = new Notification(req.body);
    const saved = await newData.save();

    res.status(201).json({ 
        success: true, 
        message: "Notification created successfully", 
        data: saved 
    });

  } catch (err: any) {
    console.error('Error creating notification:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val: any) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({ success: false, message: 'Server error during creation' });
  }
};

// 3. PUT: อัปเดตสถานะว่า "อ่านแล้ว" (เลียนแบบ updateInsuranceRate)
export const markAsRead = async (req: Request, res: Response) => {
    const { id } = req.params; // Notification ID

    if (!id) {
        return res.status(400).json({ success: false, message: 'Missing notification ID' });
    }

    try {
        const updatedNotification = await Notification.findByIdAndUpdate(
            id,
            { $set: { isRead: true } }, // บังคับแก้แค่ isRead เป็น true
            { new: true, runValidators: true }
        );

        if (!updatedNotification) {
            return res.status(404).json({ success: false, message: `Notification not found with ID: ${id}` });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: updatedNotification,
        });

    } catch (error: any) {
        console.error('Error updating notification:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format: ${id}` });
        }

        res.status(500).json({ success: false, message: 'Server error during update' });
    }
};

// 4. DELETE: ลบการแจ้งเตือน (เลียนแบบ deleteInsuranceRate)
export const deleteNotification = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ success: false, message: 'Missing notification ID' });
    }

    try {
        const deletedNotification = await Notification.findByIdAndDelete(id);

        if (!deletedNotification) {
            return res.status(404).json({ success: false, message: `Notification not found with ID: ${id}` });
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
            data: {},
        });

    } catch (error: any) {
        console.error('Error deleting notification:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format: ${id}` });
        }
        
        res.status(500).json({ success: false, message: 'Server error during delete operation' });
    }
};

export const markAsReadBulk = async (req: Request, res: Response) => {
    try {
        const { notificationIds } = req.body; // รับ Array ของ ID [id1, id2, id3]

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No notification IDs provided' });
        }

        // ใช้ updateMany เพื่ออัปเดตหลายตัวพร้อมกันที่มี ID อยู่ใน list
        await Notification.updateMany(
            { _id: { $in: notificationIds } },
            { $set: { isRead: true } }
        );

        res.status(200).json({
            success: true,
            message: 'Notifications marked as read successfully',
        });

    } catch (error) {
        console.error('Error batch updating notifications:', error);
        res.status(500).json({ success: false, message: 'Server error during batch update' });
    }
};