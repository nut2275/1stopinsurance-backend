import mongoose, { Schema, Document, Model } from "mongoose";

const PURCHASE_STATUSES = [
  'active',
  'pending',
  'payment_due',
  'about_to_expire',
  'expired',
  'rejected'
] as const;

export interface IPurchase {
  customer_id: mongoose.Types.ObjectId;
  agent_id?: mongoose.Types.ObjectId | null; 
  car_id: mongoose.Types.ObjectId;
  carInsurance_id: mongoose.Types.ObjectId;
  purchase_date: Date;
  start_date: Date;
  policy_number: string;
  status: typeof PURCHASE_STATUSES[number];
  citizenCardImage?: string;
  carRegistrationImage?: string;
}

export interface PurchaseDocument extends IPurchase, Document {}

const PurchaseSchema = new Schema<PurchaseDocument>(
  {
    customer_id: { 
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true },

    agent_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: false,
      default: null
    },

    car_id: { type: Schema.Types.ObjectId, ref: 'Car', required: true },

    carInsurance_id: {
      type: Schema.Types.ObjectId,
      ref: 'CarInsuranceRate',
      required: true
    },

    purchase_date: { type: Date, required: true, default: Date.now },

    start_date: { type: Date, required: true, default: Date.now },

    policy_number: { type: String, required: false, unique: true },

    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      required: true,
      default: "pending"
    },

    citizenCardImage: { type: String },
    carRegistrationImage: { type: String },
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
