const path = require('path');
const fs = require('fs');
const { run, connect, get } = require('../config/database');
const env = require('../config/env');
const { fileChecksum, ensureDir } = require('../utils/storage');

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Fichier manquant' });
  }
  const missionId = req.params.id;
  const relativeDir = path.join('documents', String(missionId), 'uploads');
  const filename = `${Date.now()}_${req.file.originalname}`;
  ensureDir(path.join(env.STORAGE_ROOT, relativeDir));
  const destination = path.join(env.STORAGE_ROOT, relativeDir, filename);
  fs.renameSync(req.file.path, destination);
  const stats = fs.statSync(destination);
  const checksum = fileChecksum(destination);
  const db = await connect();
  try {
    await run(
      db,
      `INSERT INTO mission_documents (mission_id, document_type, title, language, file_path, mime_type, file_size, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        missionId,
        req.body.document_type || 'justificatif',
        req.body.title || req.file.originalname,
        'fr',
        path.join(String(missionId), 'uploads', filename),
        req.file.mimetype || 'application/octet-stream',
        stats.size,
        checksum
      ]
    );
  } finally {
    db.release();
  }
  res.status(201).json({ path: path.join(String(missionId), 'uploads', filename) });
}

async function downloadDocument(req, res) {
  const documentId = req.params.id;
  const db = await connect();
  try {
    const document = await get(
      db,
      `SELECT mission_documents.*, missions_unified.reference
       FROM mission_documents
       JOIN missions_unified ON missions_unified.id = mission_documents.mission_id
       WHERE mission_documents.id = ?`,
      [documentId]
    );
    if (!document) {
      return res.status(404).json({ message: 'Document introuvable' });
    }
    const baseDir = path.join(env.STORAGE_ROOT, 'documents');
    const safePath = path.normalize(path.join(baseDir, document.file_path));
    if (!safePath.startsWith(baseDir)) {
      return res.status(400).json({ message: 'Chemin de document invalide' });
    }
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ message: 'Fichier indisponible' });
    }
    const filename = path.basename(safePath);
    res.setHeader('Content-Type', document.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(safePath);
  } finally {
    db.release();
  }
}

module.exports = { uploadDocument, downloadDocument };
