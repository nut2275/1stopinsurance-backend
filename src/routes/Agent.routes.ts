import { Router } from 'express'
import {createAgent, loginAgent, getAgentByLicense } from '../controllers/Agent.controller'

const router = Router();
import { authenticateJWT } from '../middlewares/authMiddleware';

router.post('/register', createAgent)

router.post('/login', loginAgent)

router.get("/by-license/:license", getAgentByLicense);

export default router;