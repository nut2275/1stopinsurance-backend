import mongoose from "mongoose";

const PolicyCounterSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

export default mongoose.model("PolicyCounter", PolicyCounterSchema);
