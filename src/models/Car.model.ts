import mongoose, { Document, Schema } from "mongoose";

export interface Car extends Document {
  customer_id: mongoose.Types.ObjectId;
  brand: string;
  carModel: string;
  subModel?: string;
  year: number;
  registration: string;
  color: string;
}

const CarSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    brand: {
      type: String,
      required: true
    },

    carModel: {
      type: String,
      required: true
    },

    subModel: {
      type: String
    },

    year: {
      type: Number,
      required: true
    },

    // ✅ ทะเบียนรถ
    registration: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    // ✅ จังหวัด
    province: {
      type: String,
      required: true,
      trim: true
    },

    color: {
      type: String
    }
  },
  { timestamps: true }
);

/* =====================================================
   🔒 Unique เฉพาะ "ลูกค้าคนเดิม"
   ลูกค้าคนเดียวกัน ห้ามมีทะเบียน+จังหวัดซ้ำ
===================================================== */
CarSchema.index(
  { customer_id: 1, registration: 1, province: 1 },
  { unique: true }
);

export default mongoose.model("Car", CarSchema);