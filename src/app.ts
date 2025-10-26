import express, { Application, Request, Response } from 'express';

import dotenv from 'dotenv';
import customerRoutes from './routes/Customer.routes';
import agentRoutes from './routes/Agent.routes';
import connectDB from "./config/db";
import cors from 'cors';
import helmet from 'helmet';

const app: Application = express();
const PORT = process.env.PORT || 5000;

dotenv.config();
connectDB();
app.use(helmet());
app.use(cors());

app.use(express.json());



// Middleware
app.use(express.json({ limit: '50mb' })); // เพิ่ม limit JSON สำหรับ request ใหญ่
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test root route
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// Routes
app.use('/customers', customerRoutes);
app.use('/agents', agentRoutes);

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
