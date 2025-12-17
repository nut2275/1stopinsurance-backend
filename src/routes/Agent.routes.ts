import { Router } from 'express'
import {createAgent, loginAgent, getAgentById} from '../controllers/Agent.controller'

const router = Router();
import { authenticateJWT } from '../middlewares/authMiddleware';

router.post('/register', createAgent)

router.post('/login', loginAgent)

router.get('/:id',getAgentById)

export default router;