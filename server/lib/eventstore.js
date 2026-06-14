const fs = require('fs');
const path = require('path');

function dbPath() {
  return process.env.FC_EVENTS_DB || '/var/lib/flashcards-sync/reviews.db';
}

// _db: undefined = not yet opened, null = unavailable (no node:sqlite), else DatabaseSync.
let _db;
function getDb() {
  if (_db !== undefined) return _db;
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch {
    _db = null; // Node < 22.5 (e.g. local dev on 20): degrade gracefully.
    return _db;
  }
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const handle = new DatabaseSync(p);
  handle.exec('PRAGMA journal_mode=WAL');
  handle.exec(
    `CREATE TABLE IF NOT EXISTS review_events (
       event_id    TEXT PRIMARY KEY,
       card_id     TEXT NOT NULL,
       grade       TEXT NOT NULL,
       reviewed_at INTEGER NOT NULL,
       local_date  TEXT NOT NULL,
       prev_state  INTEGER,
       new_state   INTEGER
     )`
  );
  handle.exec('CREATE INDEX IF NOT EXISTS idx_events_local_date ON review_events(local_date)');
  handle.exec('CREATE INDEX IF NOT EXISTS idx_events_reviewed_at ON review_events(reviewed_at)');
  _db = handle; // only commit after full setup succeeds
  return _db;
}

function available() {
  return getDb() !== null;
}

const VALID_GRADES = new Set(['again', 'hard', 'good', 'easy']);
function valid(e) {
  return (
    e &&
    typeof e.event_id === 'string' &&
    typeof e.card_id === 'string' &&
    VALID_GRADES.has(e.grade) &&
    typeof e.reviewed_at === 'number' &&
    Number.isFinite(e.reviewed_at) &&
    typeof e.local_date === 'string'
  );
}

// Returns count inserted, or -1 if the log is unavailable (no node:sqlite).
function insertEvents(events) {
  const db = getDb();
  if (!db) return -1;
  if (!Array.isArray(events)) return 0;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO review_events
       (event_id, card_id, grade, reviewed_at, local_date, prev_state, new_state)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  let inserted = 0;
  for (const e of events) {
    if (!valid(e)) continue;
    const r = stmt.run(
      e.event_id, e.card_id, e.grade, e.reviewed_at, e.local_date,
      Number.isInteger(e.prev_state) ? e.prev_state : null,
      Number.isInteger(e.new_state) ? e.new_state : null
    );
    if (Number(r.changes) > 0) inserted += 1;
  }
  return inserted;
}

function countEvents() {
  const db = getDb();
  if (!db) return 0;
  return Number(db.prepare('SELECT COUNT(*) AS c FROM review_events').get().c);
}

const DAY_MS = 86400000;
function statsAggregates() {
  const db = getDb();
  if (!db) return { retention30: null, reviewedByDay: {} };
  const since = Date.now() - 30 * DAY_MS;
  const ret = db
    .prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN grade != 'again' THEN 1 ELSE 0 END) AS correct
              FROM review_events WHERE reviewed_at >= ?`)
    .get(since);
  const retention30 = ret.total > 0 ? Number(ret.correct) / Number(ret.total) : null;
  const rows = db
    .prepare(`SELECT local_date AS d, COUNT(*) AS c FROM review_events
              GROUP BY local_date ORDER BY local_date DESC LIMIT 28`)
    .all();
  const reviewedByDay = {};
  for (const r of rows) reviewedByDay[r.d] = Number(r.c);
  return { retention30, reviewedByDay };
}

module.exports = { getDb, available, insertEvents, countEvents, dbPath, statsAggregates };
