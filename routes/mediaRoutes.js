import express from 'express';
import { upload, getMediaHash, uploadMedia , uploadMultipleMedia} from '../controllers/media.controller.js'; 

const router = express.Router();

router.post('/hash', upload.single('file'), getMediaHash);

router.post('/upload', upload.single('file'), uploadMedia);

router.post('/upload-multiple', upload.array('files', 10), uploadMultipleMedia);



export default router;