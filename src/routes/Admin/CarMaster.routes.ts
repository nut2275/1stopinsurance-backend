import express from 'express';
import multer from 'multer';
import { 
    getYears, getBrands, getModels, getSubModels, getYearsByFilter,
    createBulk, importExcel,
    getCarMasters, updateCarMaster, deleteCarMaster
} from '../../controllers/Admin/CarMaster.controller';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Public Dropdown
router.get('/years', getYears);
router.get('/brands', getBrands);
router.get('/models', getModels);
router.get('/sub-models', getSubModels);
router.get('/years-filter', getYearsByFilter);

// Admin Manage
router.post('/bulk', createBulk);
router.post('/import', upload.single('file'), importExcel);
router.get('/', getCarMasters);
router.put('/:id', updateCarMaster);
router.delete('/:id', deleteCarMaster);

export default router;