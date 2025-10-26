import mongoose, { Document, Schema } from 'mongoose';
// import { Customer } from '../types/customerType';

export interface Customer extends Document {
  first_name:string;
  last_name:string;
  email: string;
  address: string;
  birth_date: Date;
  phone: string;
  username: string;
  password: string;
  imgProfile_customer: string;
}

const userSchema = new Schema<Customer>({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, default: ""},
  address: { type: String, default: ""},
  birth_date: { type: Date, required: true },
  phone: { type: String, required: true },
  username: { type: String, required: true ,unique:true},
  password: { type: String, required: true },
  imgProfile_customer: {type: String, default: ""}
}, { timestamps: true });

export default mongoose.model<Customer>('Customer', userSchema);