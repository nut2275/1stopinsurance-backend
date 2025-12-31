import mongoose, { Schema, Document, Model } from "mongoose";

const PURCHASE_STATUSES = [
  'active',
  'pending',
  'pending_payment',
  'about_to_expire',
  'expired',
  'rejected'
] as const;

// 1. แก้ไข Interface ให้เป็น TypeScript Type ที่ถูกต้อง
export interface IPurchase {
  customer_id: mongoose.Types.ObjectId;
  agent_id?: mongoose.Types.ObjectId | null; 
  car_id: mongoose.Types.ObjectId;
  carInsurance_id: mongoose.Types.ObjectId;
  
  purchase_date: Date;
  start_date: Date;
  end_date?: Date; // ✅ เพิ่มและทำเป็น Optional
  
  policy_number?: string;
  status: typeof PURCHASE_STATUSES[number];
  reject_reason?: string;

  // รูปภาพ
  citizenCardImage?: string;
  carRegistrationImage?: string;
  paymentSlipImage?: string;
  policyFile?: string;
  
  installmentDocImage?: string; // ✅ เพิ่ม
  consentFormImage?: string;    // ✅ เพิ่ม

  // Payment
  paymentMethod: 'full' | 'installment'; // ✅ แก้จาก Object เป็น String Enum Type
}

export interface PurchaseDocument extends IPurchase, Document {}

const PurchaseSchema = new Schema<PurchaseDocument>(
  {
    customer_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Customer', 
      required: true 
    },

    agent_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: false,
      default: null
    },

    car_id: { type: Schema.Types.ObjectId, ref: 'Car', required: true },

    carInsurance_id: {
      type: Schema.Types.ObjectId,
      ref: 'CarInsuranceRate', // ตรวจสอบชื่อ Model นี้ว่าตรงกับไฟล์ CarInsuranceRate ของคุณไหม
      required: true
    },

    purchase_date: { type: Date, required: true, default: Date.now },
    start_date: { type: Date, default: null },
    
    // ✅ เพิ่ม Field วันสิ้นสุดลงใน Schema
    end_date: { type: Date, required: false, default: null },

    policy_number: { type: String, required: false }, // แนะนำ: เอา unique: true ออกถ้ายังไม่มีระบบ Gen เลขที่แน่นอน หรือใช้ sparse: true

    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      required: true,
      default: "pending"
    },

    // รูปภาพเดิม
    citizenCardImage: { type: String },
    carRegistrationImage: { type: String },
    paymentSlipImage: { type: String, default: null },
    policyFile: { type: String, default: null },

    // ✅ เพิ่ม Field รูปภาพใหม่ลงใน Schema
    installmentDocImage: { type: String, default: null },
    consentFormImage: { type: String, default: null },

    // ✅ เพิ่ม Field การชำระเงินลงใน Schema
    paymentMethod: { 
        type: String, 
        enum: ['full', 'installment'], 
        default: 'full'
    },

    reject_reason: { type: String, default: null },
    
  },
  {
    timestamps: true,
  }
);

const PurchaseModel: Model<PurchaseDocument> = mongoose.model<PurchaseDocument>(
  'Purchase',
  PurchaseSchema
);

export default PurchaseModel;