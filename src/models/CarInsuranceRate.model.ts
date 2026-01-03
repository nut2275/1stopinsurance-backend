import { Schema, model, Document } from "mongoose";

export interface CarInsuranceRateOop extends Document {
  carBrand: string;
  carModel: string;
  subModel: string;
  year: number;
  insuranceBrand: string;
  level: string;
  repairType?: string;
  hasFireCoverage?: boolean;
  hasFloodCoverage?: boolean;
  hasTheftCoverage?: boolean;
  personalAccidentCoverageOut?: number;
  personalAccidentCoverageIn?: number;
  propertyDamageCoverage?: number;
  perAccidentCoverage?: number;
  fireFloodCoverage?: number;
  firstLossCoverage?: number;
  premium?: number;
}

const carInsuranceSchema = new Schema<CarInsuranceRateOop>(
  {
    carBrand: { type: String, required: true },
    carModel: { type: String, required: true },
    subModel: { type: String, required: true },
    year: { type: Number, required: true },
    insuranceBrand: { type: String, required: true },
    level: { type: String, required: true }, // ชั้นประกัน
    repairType: { type: String, default: "ซ่อมอู่" },
    hasFireCoverage: { type: Boolean, default: false },
    hasFloodCoverage: { type: Boolean, default: false },
    hasTheftCoverage: { type: Boolean, default: false },
    personalAccidentCoverageOut: { type: Number, default: 0 },
    personalAccidentCoverageIn: { type: Number, default: 0 },
    propertyDamageCoverage: { type: Number, default: 0 },
    perAccidentCoverage: { type: Number, default: 0 },
    fireFloodCoverage: { type: Number, default: 0 },
    firstLossCoverage: { type: Number, default: 0 },
    premium: { type: Number, default: 0 },

  },
  { timestamps: true }
);

export default model<CarInsuranceRateOop>("CarInsuranceRate", carInsuranceSchema);
