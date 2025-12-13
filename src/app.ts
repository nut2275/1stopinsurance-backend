import express, { Application, Request, Response } from 'express';

import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

import connectDB from "./config/db";
import customerRoutes from './routes/Customer.routes';
import agentRoutes from './routes/Agent.routes';
import carInsuranceRate from './routes/CarInsuranceRate.routes';
import PurchaseRoutes from './routes/Purchase.routes';

const app: Application = express();
const PORT = process.env.PORT || 5000;

dotenv.config();
connectDB();
app.use(helmet());
app.use(cors());


// ✅ ใช้การกำหนดค่า Limit ตรงนี้จุดเดียวพอครับ
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Test root route
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// Routes
app.use('/customers', customerRoutes);
app.use('/agents', agentRoutes);
app.use('/api', carInsuranceRate);
app.use('/purchase', PurchaseRoutes);

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));