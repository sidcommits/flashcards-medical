const fs = require('fs');
const path = require('path');
const { emptyDoc } = require('./merge');

function storePath() {
  return process.env.FC_DATA_FILE || '/var/lib/flashcards-sync/progress.json';
}

function readDoc() {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch {
    return emptyDoc();
  }
}

function writeDoc(doc) {
  const p = storePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(doc));
  fs.renameSync(tmp, p);
}

module.exports = { readDoc, writeDoc, storePath };
