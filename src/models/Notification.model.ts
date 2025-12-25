import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Define Interface (Type Definition)
export interface INotification extends Document {
  recipientId: string;
  sender?: {
    name: string;
    role: 'admin' | 'agent' | 'customer';
  };
  recipientType: 'agent' | 'customer';
  message: string;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
  relatedPurchaseId?: string;
  createdAt: Date;
}

// 2. Define Schema
const NotificationSchema: Schema<INotification> = new Schema({
  recipientId: { 
    type: String, 
    required: [true, 'Please provide recipient ID'] 
  },
  recipientType: { 
    type: String, 
    enum: ['agent', 'customer'], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['info', 'warning', 'success'], 
    default: 'info' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  relatedPurchaseId: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  sender: {
    name: { type: String },
    role: { type: String, enum: ['admin', 'agent', 'customer'] }
  }
});

// 3. Export Model (ป้องกัน Error Model Overwrite ใน Next.js)
const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;