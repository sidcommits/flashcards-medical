const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.FC_EVENTS_DB = path.join(os.tmpdir(), `fc-events-${process.pid}.db`);
const store = require('../lib/eventstore');

const ev = (over = {}) => ({
  event_id: 'e1', card_id: 'c1', grade: 'good',
  reviewed_at: 1718000000000, local_date: '2026-06-14',
  prev_state: 0, new_state: 1, ...over,
});

test('inserts an event and counts it', () => {
  const before = store.countEvents();
  assert.strictEqual(store.insertEvents([ev()]), 1);
  assert.strictEqual(store.countEvents(), before + 1);
});

test('is idempotent on event_id (re-send inserts nothing)', () => {
  store.insertEvents([ev({ event_id: 'dup' })]);
  const before = store.countEvents();
  assert.strictEqual(store.insertEvents([ev({ event_id: 'dup' })]), 0);
  assert.strictEqual(store.countEvents(), before);
});

test('skips invalid events (bad grade / missing fields)', () => {
  assert.strictEqual(store.insertEvents([ev({ event_id: 'bad1', grade: 'BOGUS' })]), 0);
  assert.strictEqual(store.insertEvents([{ event_id: 'bad2' }]), 0);
});

test('available() is true when node:sqlite loaded', () => {
  assert.strictEqual(store.available(), true);
});

test('returns 0 for non-array input', () => {
  assert.strictEqual(store.insertEvents('e1'), 0);
  assert.strictEqual(store.insertEvents(null), 0);
});

test('rejects a non-finite reviewed_at', () => {
  assert.strictEqual(store.insertEvents([ev({ event_id: 'nan1', reviewed_at: NaN })]), 0);
});

test('accepts a new-card event (prev_state 0)', () => {
  const before = store.countEvents();
  assert.strictEqual(store.insertEvents([ev({ event_id: 'newcard', prev_state: 0, new_state: 1 })]), 1);
  assert.strictEqual(store.countEvents(), before + 1);
});
