import express from 'express';
import multer from 'multer';
import { 
    getYears, getBrands, getModels, getSubModels, createBulk, importExcel 
} from '../../controllers/Admin/CarMaster.controller';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Public Dropdown
router.get('/years', getYears);
router.get('/brands', getBrands);
router.get('/models', getModels);
router.get('/sub-models', getSubModels);

// Admin Manage
router.post('/bulk', createBulk);
router.post('/import', upload.single('file'), importExcel);

export default router;