const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.FC_DATA_FILE = path.join(os.tmpdir(), `fc-stats-${process.pid}.json`);
process.env.FC_EVENTS_DB = path.join(os.tmpdir(), `fc-stats-${process.pid}.db`);
process.env.COOKIE_SECRET = 'itest-secret';
process.env.PASSWORD_HASH = require('../lib/password').hashPassword('pw');
const { createServer } = require('../index.js');
const { insertEvents } = require('../lib/eventstore');
const server = createServer();
after(() => server.close());
const base = () => `http://127.0.0.1:${server.address().port}`;

test('GET /api/stats returns retention + daily counts', async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const now = Date.now();
  insertEvents([
    { event_id: 's1', card_id: 'c1', grade: 'good', reviewed_at: now, local_date: '2026-06-14', prev_state: 0, new_state: 1 },
    { event_id: 's2', card_id: 'c2', grade: 'again', reviewed_at: now, local_date: '2026-06-14', prev_state: 0, new_state: 0 },
    { event_id: 's3', card_id: 'c3', grade: 'good', reviewed_at: now, local_date: '2026-06-13', prev_state: 0, new_state: 1 },
  ]);

  let res = await fetch(`${base()}/api/stats`);
  assert.strictEqual(res.status, 401); // gated

  res = await fetch(`${base()}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'pw' }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];

  res = await fetch(`${base()}/api/stats`, { headers: { cookie } });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(Math.abs(body.retention30 - 2 / 3) < 1e-9); // 2 of 3 not 'again'
  assert.strictEqual(body.reviewedByDay['2026-06-14'], 2);
  assert.strictEqual(body.reviewedByDay['2026-06-13'], 1);
});
