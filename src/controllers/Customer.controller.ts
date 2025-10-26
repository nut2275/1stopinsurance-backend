import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.model';
import { AuthRequest } from '../middlewares/authMiddleware'; // ✅ เพิ่มบรรทัดนี้
import { ROLES } from '../interfaces/type';

// Secret สำหรับ JWT (ควรเก็บใน .env)
const JWT_SECRET = process.env.JWT_SECRET || '92680bcc59e60c4753ce03a8e6efb1bc';
// if (!process.env.JWT_SECRET) {
//   throw new Error('❌ Missing JWT_SECRET environment variable');
// }
// const JWT_SECRET = process.env.JWT_SECRET;

// =========================
// CREATE CUSTOMER (Register)
// =========================


export const createCustomer = async (req: Request, res: Response) => {
  // console.log(req.body);
  const {first_name, last_name, email, address, birth_date, phone, username, password} = req.body;

  try {
    if (!first_name || !last_name || !email || !address || !birth_date || !phone || !username || !password) {
      return res.status(400).json({ message: "Some input fields are missing" });
    }

    // ตรวจสอบ username ซ้ำ
    const existing = await Customer.findOne({ username: username });
    if (existing) {
      console.log("Username already exists");
      return res.status(400).json({ message: "username นี้มีผู้ใช้แล้ว" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้าง user ใหม่
    const user = new Customer({
      first_name, last_name, email, address, 
      birth_date: new Date(birth_date), 
      phone, username,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: "User created successfully", user });
    
  } catch (err) {
    console.error("Error creating user:", err);
    res.send("Server error")
  }
};

// =========================
// LOGIN CUSTOMER
// =========================

export const loginCustomer = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const customer = await Customer.findOne({ username });
    if (!customer) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // ✅ สร้าง token พร้อม username
    const token = jwt.sign(
      { 
        _id: customer._id,
        first_name: customer.first_name, 
        last_name:customer.last_name,
        email: customer.email,
        address: customer.address,
        birth_date: customer.birth_date,
        phone: customer.phone,
        username: customer.username,
        imgProfile_customer: customer.imgProfile_customer,
        role:ROLES.CUSTOMER
      }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      customer: { 
        _id: customer._id,
        first_name: customer.first_name, 
        last_name:customer.last_name,
        email: customer.email,
        address: customer.address,
        birth_date: customer.birth_date,
        phone: customer.phone,
        username: customer.username,
        imgProfile_customer: customer.imgProfile_customer,
        role:ROLES.CUSTOMER
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};


// ดึงข้อมูล user จาก token
export const getProfile = async (req: Request, res: Response) => {
  try {
    // console.log(req.body);
    
    const {username, _id} = req.body;
    if (!_id) {
      return res.status(400).json({ message: "Missing _id in request body" });
    }
    const customerData = await Customer.findById(_id)

    if (!customerData) {
      return res.status(404).json({ message: "Customer not found" });
    }
    console.log("Found data:", customerData);
    res.json(customerData)

  }
  catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};









//ข้างล่างยังไม่ได้ใช้งาน

// =========================
// GET ALL CUSTOMERS
// =========================
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find().select('-password'); // ไม่ส่ง password กลับ
    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// =========================
// GET CUSTOMER BY ID
// =========================
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id).select('-password');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    res.status(200).json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// =========================
// UPDATE CUSTOMER
// =========================
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // ถ้า update password ต้อง hash ก่อน
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });

    res.status(200).json({ message: 'Customer updated', customer: updatedCustomer });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
 
// =========================
// DELETE CUSTOMER
// =========================
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await Customer.findByIdAndDelete(id);
    if (!deletedCustomer) return res.status(404).json({ message: 'Customer not found' });

    res.status(200).json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};


