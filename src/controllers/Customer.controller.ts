import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.model';
import { AuthRequest } from '../middlewares/authMiddleware'; // ✅ เพิ่มบรรทัดนี้

// Secret สำหรับ JWT (ควรเก็บใน .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// =========================
// CREATE CUSTOMER (Register)
// =========================


export const createCustomer = async (req: Request, res: Response) => {
  console.log(req.body);
  try {
    const {first_name, last_name, email, address, birth_date, phone, username, password} = req.body;

    // ตรวจสอบ username ซ้ำ
    const existing = await Customer.findOne({ username: username });
    if (existing) {
      console.log("Username already exists");
      return res.status(400).json({ message: "Username already exists" });
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
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // ✅ สร้าง token พร้อม username
    const token = jwt.sign(
      { id: customer._id, username: customer.username }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      user: { 
        id: customer._id, 
        username: customer.username 
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};


// ดึงข้อมูล user จาก token
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const customer = await Customer.findById(req.user.id).select("-password"); 
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
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


