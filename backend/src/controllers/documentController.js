const path = require('path');
const fs = require('fs');
const { run, connect, get, all } = require('../config/database');
const env = require('../config/env');
const { fileChecksum, ensureDir } = require('../utils/storage');
const workflowService = require('../services/workflowService');

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Fichier manquant' });
  }
  const missionId = req.params.id;
  const tmpPath = req.file.path;
  const cleanupTemp = () => {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (error) {
      console.error('Unable to clean temporary upload', error);
    }
  };
  const db = await connect();
  let storedPath = null;
  try {
    const mission = await get(
      db,
      'SELECT id, status, created_by FROM missions_unified WHERE id = ?',
      [missionId]
    );
    if (!mission) {
      cleanupTemp();
      return res.status(404).json({ message: 'Mission introuvable' });
    }
    if (mission.status !== 'approved') {
      cleanupTemp();
      return res.status(400).json({ message: "La mission n'est pas en attente de documents justificatifs" });
    }
    const isInitiator = mission.created_by === req.user.id;
    const isSuperAdmin = req.user.roleCode === 'super_admin';
    if (!isInitiator && !isSuperAdmin) {
      cleanupTemp();
      return res.status(403).json({ message: 'Seul l’initiateur de la mission peut déposer ces documents' });
    }

    const documentType = req.body.document_type || 'justificatif';
    const relativeDir = path.join('documents', String(missionId), 'uploads');
    ensureDir(path.join(env.STORAGE_ROOT, relativeDir));
    const filename = `${Date.now()}_${req.file.originalname}`;
    const destination = path.join(env.STORAGE_ROOT, relativeDir, filename);

    if (['mission_report', 'stamped_order'].includes(documentType)) {
      const existingDocs = await all(
        db,
        'SELECT id, file_path FROM mission_documents WHERE mission_id = ? AND document_type = ?',
        [missionId, documentType]
      );
      for (const doc of existingDocs) {
        const existingPath = doc.file_path.startsWith('documents')
          ? path.join(env.STORAGE_ROOT, doc.file_path)
          : path.join(env.STORAGE_ROOT, 'documents', doc.file_path);
        try {
          if (fs.existsSync(existingPath)) {
            fs.unlinkSync(existingPath);
          }
        } catch (error) {
          console.warn('Unable to remove previous document', existingPath, error);
        }
        await run(db, 'DELETE FROM mission_documents WHERE id = ?', [doc.id]);
      }
    }

    fs.renameSync(tmpPath, destination);
    storedPath = destination;
    const stats = fs.statSync(destination);
    const checksum = fileChecksum(destination);

    await run(
      db,
      `INSERT INTO mission_documents (mission_id, document_type, title, language, file_path, mime_type, file_size, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        missionId,
        documentType,
        req.body.title || req.file.originalname,
        'fr',
        path.join(String(missionId), 'uploads', filename),
        req.file.mimetype || 'application/octet-stream',
        stats.size,
        checksum
      ]
    );

    await workflowService.ensureDocumentsAdvance(db, missionId, req.user);

    res.status(201).json({ path: path.join(String(missionId), 'uploads', filename) });
  } catch (error) {
    console.error('uploadDocument error', error);
    if (storedPath) {
      try {
        fs.unlinkSync(storedPath);
      } catch (cleanupError) {
        console.error('Unable to cleanup stored document', cleanupError);
      }
    } else {
      cleanupTemp();
    }
    res.status(500).json({ message: "Impossible d'enregistrer le document" });
  } finally {
    db.release();
  }
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
