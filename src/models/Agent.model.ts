import mongoose, { Document, Schema } from 'mongoose';

export interface Agent extends Document {
  // agent_id:string;
  first_name: string;
  last_name: string;
  agent_license_number: string;
  card_expiry_date: Date;
  address: string;
  imgProfile?: string;      // URL ของ profile image
  idLine?: string;   // URL ของ LINE QR code
  phone: string;
  note?: string;
  username: string;
  password: string;        // ควร hash ก่อนบันทึก
  birth_date: Date;
  verification_status: string;
}

const AgentSchema: Schema = new Schema<Agent>(
  {
    // agent_id: {type: String, required: true, unique: true},
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    agent_license_number: { type: String, required: true, unique: true },
    card_expiry_date: { type: Date, required: true },
    address: { type: String, required: true },
    imgProfile: { type: String, default: "" },
    idLine: { type: String, default: "" },
    phone: { type: String, required: true },
    note: { type: String, default: "" },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birth_date: { type: Date, required: true },
    verification_status: {
      type: String,
      enum: ['in_review', 'approved', 'rejected'],
      required: true,
      default: 'in_review',
    },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt ให้อัตโนมัติ
  }
);

// Export model
export default mongoose.model<Agent>('Agent', AgentSchema);