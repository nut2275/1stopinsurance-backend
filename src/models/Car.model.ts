import mongoose, { Document, Schema } from 'mongoose';

// 1. แก้ไขชื่อฟิลด์ที่ชนกัน: 'model' -> 'carModel'
export interface Car extends Document {
    customer_id: string;
    brand: string;
    carModel: string; // ✅ แก้ไขตรงนี้
    subModel: string;
    year: number; 
    registration: string; 
    color: string;
}

const CarSchema: Schema<Car> = new Schema<Car>(
    {
        customer_id: { type: String, required: true },
        brand: { type: String, required: true },
        carModel: { type: String, required: true }, 
        subModel: { type: String }, 
        year: { type: Number, required: true },
        registration: { type: String, unique: true }, 
        color: { type: String },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<Car>('Car', CarSchema);