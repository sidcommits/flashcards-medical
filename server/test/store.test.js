const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

const tmp = path.join(os.tmpdir(), `fc-store-${process.pid}.json`);
process.env.FC_DATA_FILE = tmp;
const { readDoc, writeDoc } = require('../lib/store');

test('readDoc returns empty doc when file missing', () => {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  const d = readDoc();
  assert.deepStrictEqual(d.reviews, {});
});

test('writeDoc then readDoc round-trips', () => {
  writeDoc({ version: 1, updatedAt: 1, resetAt: null, reviews: { a: { ts: 1 } }, bookmarks: {}, hidden: {} });
  assert.strictEqual(readDoc().reviews.a.ts, 1);
  fs.unlinkSync(tmp);
});
