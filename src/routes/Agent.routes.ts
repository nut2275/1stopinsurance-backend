import { Router } from 'express'
import {createAgent, loginAgent, } from '../controllers/Agent.controller'

const router = Router();
import { authenticateJWT } from '../middlewares/authMiddleware';

router.post('/register', createAgent)

router.post('/login', loginAgent)

export default router;