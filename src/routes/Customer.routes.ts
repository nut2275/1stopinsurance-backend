
import { Router } from 'express';
import {
  createCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getProfile 
} from '../controllers/Customer.controller';


const router = Router();
// ------------------------
// PUBLIC ROUTES
// ------------------------
// Register
router.post('/register', createCustomer);
// Login
router.post('/login', loginCustomer);
router.post("/profile", getProfile);

import { authenticateJWT } from '../middlewares/authMiddleware';
// ------------------------
// PROTECTED ROUTES (ต้อง login)
// ------------------------
router.get('/', authenticateJWT, getAllCustomers);
router.get('/:id', authenticateJWT, getCustomerById);
router.put('/:id', authenticateJWT, updateCustomer);
router.delete('/:id', authenticateJWT, deleteCustomer);


export default router;
