import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICarMaster extends Document {
  brand: string;
  carModel: string;
  subModel: string;
  year: number;
}

const CarMasterSchema = new Schema<ICarMaster>(
  {
    brand: { type: String, required: true, index: true },
    carModel: { type: String, required: true, index: true },
    subModel: { type: String, required: true },
    year: { type: Number, required: true, index: true },
  },
  { timestamps: true }
);

// Compound Index: ป้องกันข้อมูลซ้ำ (เช่น Toyota Yaris Sport 2024 ห้ามมี 2 แถว)
CarMasterSchema.index({ brand: 1, model: 1, subModel: 1, year: 1 }, { unique: true });

const CarMasterModel: Model<ICarMaster> = mongoose.model<ICarMaster>('CarMaster', CarMasterSchema);
export default CarMasterModel;