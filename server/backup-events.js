// Consistent single-file snapshot of the SQLite review log via VACUUM INTO.
// Usage: node backup-events.js <dest.db>   (no-op if the source doesn't exist yet)
const fs = require('fs');
const dest = process.argv[2];
if (!dest) {
  console.error('usage: backup-events.js <dest.db>');
  process.exit(1);
}
const src = process.env.FC_EVENTS_DB || '/var/lib/flashcards-sync/reviews.db';
if (!fs.existsSync(src)) process.exit(0);

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(src);
db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
db.close();
console.log('events backup ->', dest);
