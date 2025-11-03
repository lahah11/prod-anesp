const express = require('express');
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const env = require('../config/env');
const { ensureDir } = require('../utils/storage');
const { requireAnyPermission } = require('../middleware/permissions');

const uploadDir = path.join(env.STORAGE_ROOT, 'tmp');
ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

const router = express.Router();
const workflowPermissions = [
  'mission_create',
  'mission_validate_technical',
  'mission_assign_logistics',
  'mission_validate_finance',
  'mission_validate_final'
];

router.post(
  '/:id',
  requireAnyPermission(['mission_create', 'mission_assign_logistics']),
  upload.single('file'),
  documentController.uploadDocument
);

router.get('/:id/download', requireAnyPermission(workflowPermissions), documentController.downloadDocument);

module.exports = router;
