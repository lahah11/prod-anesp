const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveBuffer(relativePath, buffer) {
  const fullPath = path.join(env.STORAGE_ROOT, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

function saveStream(relativePath, stream) {
  const fullPath = path.join(env.STORAGE_ROOT, relativePath);
  ensureDir(path.dirname(fullPath));
  const writeStream = fs.createWriteStream(fullPath);
  stream.pipe(writeStream);
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(fullPath));
    writeStream.on('error', reject);
  });
}

function fileChecksum(fullPath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(fullPath);
  hash.update(data);
  return hash.digest('hex');
}

module.exports = {
  ensureDir,
  saveBuffer,
  saveStream,
  fileChecksum
};
