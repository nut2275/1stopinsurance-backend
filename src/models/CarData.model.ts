import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    variants: [String]
  },
  { _id: false }
);

const CarDataSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, unique: true },
    models: [ModelSchema]
  },
  { timestamps: true }
);

const CarData = mongoose.model("carData", CarDataSchema);

export default CarData; // ⭐ สำคัญมาก
