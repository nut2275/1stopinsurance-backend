import mongoose, { Document, Schema } from 'mongoose';

export interface Agent extends Document {
  firstName: string;
  lastName: string;
  agentLicenseNumber: string;
  cardExpiryDate: Date;
  address: string;
  imgProfile: string;      // URL ของ profile image
  imgLineQrCode: string;   // URL ของ LINE QR code
  phone: string;
  note?: string;
  username: string;
  password: string;        // ควร hash ก่อนบันทึก
  birthdate: Date;
}

const agentSchema = new Schema<Agent>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    agentLicenseNumber: { type: String, required: true, unique: true },
    cardExpiryDate: { type: Date, required: true },
    address: { type: String, required: true },
    imgProfile: { type: String, required: true },
    imgLineQrCode: { type: String, required: true },
    phone: { type: String, required: true },
    note: { type: String },  // ไม่บังคับและไม่ unique
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthdate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Export model
export default mongoose.model<Agent>('Agent', agentSchema);