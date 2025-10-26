// import mongoose, {Schema, Document} from "mongoose";

// // กำหนดค่า Enum ที่เป็นไปได้
// const PURCHASE_STATUSES = [
//     'active', 
//     'pending', 
//     'payment_due', 
//     'about_to_expire', 
//     'expired', 
//     'rejected'
// ];

// export interface Purchase extends Document {
//     customer_id: string;
//     agent_id: string;
//     car_id: string;
//     carInsurance_id: string;
//     purchase_date: Date;
//     start_date: Date;
//     policy_number: string;
//     status: string; //(active, about to expried, expired, rejected, pedding, payment,)
// }

// const PurchaseSchema: Schema<Purchase> = new Schema<Purchase>(
//     {
//         // ใช้ ObjectId สำหรับ Foreign Keys (ถ้ามี)
//         customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true }, 
//         agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
//         car_id: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
//         carInsurance_id: { type: Schema.Types.ObjectId, ref: 'CarInsurance', required: true },


//         // customer_id: { type: String, required: true },
//         // agent_id: { type: String, required: true },
//         // car_id: { type: String, required: true },
//         // carInsurance_id: { type: String, required: true },

//         purchase_date: { type: Date, required: true, default: Date.now }, // ✅ วันที่ทำรายการ
//         start_date: { type: Date, required: true }, // วันที่กรมธรรม์มีผล

//         policy_number: { type: String, required: true, unique: true },
//         status: { 
//             type: String, 
//             enum: PURCHASE_STATUSES, // ✅ ใช้ Enum เพื่อจำกัดค่า
//             required: true, 
//             default: 'pending' 
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// export default mongoose.model<Purchase>('Purchase', PurchaseSchema);


import mongoose, { Schema, Document, Model } from "mongoose";

const PURCHASE_STATUSES = [
  'active', 
  'pending', 
  'payment_due', 
  'about_to_expire', 
  'expired', 
  'rejected'
] as const;

// ✅ Interface สำหรับข้อมูลที่บันทึกใน MongoDB
export interface IPurchase {
  customer_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  car_id: mongoose.Types.ObjectId;
  carInsurance_id: mongoose.Types.ObjectId;
  purchase_date: Date;
  start_date: Date;
  policy_number: string;
  status: typeof PURCHASE_STATUSES[number];
}

// ✅ Interface สำหรับ Document (ใช้กับ Mongoose)
export interface PurchaseDocument extends IPurchase, Document {}

// ✅ Schema
const PurchaseSchema = new Schema<PurchaseDocument>(
  {
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    car_id: { type: Schema.Types.ObjectId, ref: 'Car', required: true },
    carInsurance_id: { type: Schema.Types.ObjectId, ref: 'CarInsurance', required: true },

    purchase_date: { type: Date, required: true, default: Date.now },
    start_date: { type: Date, required: true },
    policy_number: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      required: true,
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Model
const PurchaseModel: Model<PurchaseDocument> = mongoose.model<PurchaseDocument>(
  'Purchase',
  PurchaseSchema
);


export default PurchaseModel;
