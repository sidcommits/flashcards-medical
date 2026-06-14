const { test } = require('node:test');
const assert = require('node:assert');
const { mergeMap, mergeDoc, emptyDoc } = require('../lib/merge');

test('mergeMap keeps newest ts; incoming wins ties', () => {
  const a = { x: { on: true, ts: 5 }, y: { on: true, ts: 9 } };
  const b = { x: { on: false, ts: 7 }, y: { on: false, ts: 9 }, z: { on: true, ts: 1 } };
  const m = mergeMap(a, b, (f) => f.ts);
  assert.strictEqual(m.x.on, false); // 7 > 5
  assert.strictEqual(m.y.on, false); // tie -> incoming
  assert.strictEqual(m.z.on, true);  // new
});

test('mergeDoc merges all three maps', () => {
  const base = { ...emptyDoc(), reviews: { c1: { ts: 1, ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 } } };
  const inc = { reviews: { c1: { ts: 2, ease: 2.5, interval: 1, due: 99, reps: 1, lapses: 0 } }, bookmarks: { c1: { on: true, ts: 3 } }, hidden: {} };
  const out = mergeDoc(base, inc);
  assert.strictEqual(out.reviews.c1.interval, 1);
  assert.strictEqual(out.bookmarks.c1.on, true);
});

test('examDate newest wins, goalDays union, back-compat', () => {
  const { mergeDoc, emptyDoc } = require('../lib/merge');
  const a = { ...emptyDoc(), examDate: { value: '2026-09-01', ts: 10 }, goalDays: { d1: { on: true, ts: 5 } } };
  const b = { ...emptyDoc(), examDate: { value: '2026-10-01', ts: 20 }, goalDays: { d2: { on: true, ts: 6 } } };
  const m = mergeDoc(a, b);
  assert.strictEqual(m.examDate.value, '2026-10-01');
  assert.deepStrictEqual(Object.keys(m.goalDays).sort(), ['d1', 'd2']);
  // legacy doc without the fields
  const legacy = { version: 1, updatedAt: 0, resetAt: null, reviews: {}, bookmarks: {}, hidden: {} };
  const m2 = mergeDoc(legacy, emptyDoc());
  assert.strictEqual(m2.examDate.value, null);
  assert.deepStrictEqual(m2.goalDays, {});
});
