export interface Customer extends Document {
  first_name:string;
  last_name:string;
  email: string;
  address: string;
  birth_date: Date;
  phone: string;
  username: string;
  password: string;
}