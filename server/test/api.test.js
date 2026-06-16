const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.FC_DATA_FILE = path.join(os.tmpdir(), `fc-api-${process.pid}.json`);
process.env.COOKIE_SECRET = 'itest-secret';
process.env.PASSWORD_HASH = require('../lib/password').hashPassword('correct-horse');
const { createServer } = require('../index.js');
const server = createServer();
after(() => server.close());

const base = () => `http://127.0.0.1:${server.address().port}`;
async function start() { await new Promise((r) => server.listen(0, '127.0.0.1', r)); }

test('full auth + sync flow', async () => {
  await start();

  // wrong password
  let res = await fetch(`${base()}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'nope' }) });
  assert.strictEqual(res.status, 401);

  // unauth progress
  res = await fetch(`${base()}/api/progress`);
  assert.strictEqual(res.status, 401);

  // correct password -> cookie
  res = await fetch(`${base()}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'correct-horse' }) });
  assert.strictEqual(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];

  // _verify ok
  res = await fetch(`${base()}/_verify`, { headers: { cookie } });
  assert.strictEqual(res.status, 200);

  // PUT merges
  res = await fetch(`${base()}/api/progress`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews: { c1: { ts: 5, ease: 2.5, interval: 1, due: 1, reps: 1, lapses: 0 } }, bookmarks: { c1: { on: true, ts: 6 } }, hidden: {}, mastered: { c1: { on: true, ts: 6 } } }) });
  let doc = await res.json();
  assert.strictEqual(doc.bookmarks.c1.on, true);

  // GET returns stored
  res = await fetch(`${base()}/api/progress`, { headers: { cookie } });
  doc = await res.json();
  assert.strictEqual(doc.reviews.c1.interval, 1);
  assert.strictEqual(doc.mastered.c1.on, true); // mastered round-trips through PUT

  // reset clears
  res = await fetch(`${base()}/api/progress`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: true }) });
  doc = await res.json();
  assert.deepStrictEqual(doc.reviews, {});
  assert.ok(doc.resetAt);
});
