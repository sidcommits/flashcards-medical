const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.FC_DATA_FILE = path.join(os.tmpdir(), `fc-evtapi-${process.pid}.json`);
process.env.FC_EVENTS_DB = path.join(os.tmpdir(), `fc-evtapi-${process.pid}.db`);
process.env.COOKIE_SECRET = 'itest-secret';
process.env.PASSWORD_HASH = require('../lib/password').hashPassword('correct-horse');
const { createServer } = require('../index.js');
const { countEvents } = require('../lib/eventstore');
const server = createServer();
after(() => server.close());

const base = () => `http://127.0.0.1:${server.address().port}`;
async function start() { await new Promise((r) => server.listen(0, '127.0.0.1', r)); }

test('POST /api/events: auth, validation, idempotent insert', async () => {
  await start();

  // unauth -> 401
  let res = await fetch(`${base()}/api/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [] }),
  });
  assert.strictEqual(res.status, 401);

  // login -> cookie
  res = await fetch(`${base()}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'correct-horse' }),
  });
  const cookie = res.headers.get('set-cookie').split(';')[0];

  // bad body (events not an array) -> 400
  res = await fetch(`${base()}/api/events`, {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: 'nope' }),
  });
  assert.strictEqual(res.status, 400);

  // authed insert -> 200, inserted: 1
  const event = { event_id: 'a1', card_id: 'c1', grade: 'good', reviewed_at: 1718000000000, local_date: '2026-06-14', prev_state: 0, new_state: 1 };
  res = await fetch(`${base()}/api/events`, {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
  });
  let body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.inserted, 1);

  // re-send same event -> inserted: 0 (idempotent), count still 1
  res = await fetch(`${base()}/api/events`, {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
  });
  body = await res.json();
  assert.strictEqual(body.inserted, 0);
  assert.strictEqual(countEvents(), 1);
});
