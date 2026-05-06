import express from 'express';
import {
  uploadFile,
  uploadMultiple,
  uploadProfilePhoto,
  uploadProjectFile,
  uploadGroupPhoto,
  uploadMessageAttachment,
  deleteFile,
} from '../controllers/upload.Controller.js';
import { protect } from '../middleware/auth.js';
import upload, { uploadMultiple as uploadMultipleMw, uploadProfilePhoto as uploadProfilePhotoMw } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Generic upload — form field name: "file"
router.post('/', upload.single('file'), uploadFile);

// Multiple files — form field name: "files"
router.post('/multiple', uploadMultipleMw, uploadMultiple);

// Profile photo — form field name: "photo"
router.post('/profile-photo', uploadProfilePhotoMw, uploadProfilePhoto);

// Project file — form field name: "file"
router.post('/project/:projectId', upload.single('file'), uploadProjectFile);

// Group photo — form field name: "photo"
router.post('/group/:groupId/photo', upload.single('photo'), uploadGroupPhoto);

// Message attachment — form field name: "file"
router.post('/message-attachment', upload.single('file'), uploadMessageAttachment);

// Delete (public_id may contain slashes, use wildcard)
router.delete('/', deleteFile);

export default router;