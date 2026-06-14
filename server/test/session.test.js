const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.FC_DATA_FILE = path.join(os.tmpdir(), `fc-session-${process.pid}.json`);
process.env.COOKIE_SECRET = 'session-test-secret';
process.env.PASSWORD_HASH = require('../lib/password').hashPassword('pw');
const { createServer } = require('../index.js');
const { COOKIE_NAME } = require('../lib/cookie');
const server = createServer();
after(() => server.close());

const base = () => `http://127.0.0.1:${server.address().port}`;

test('sliding session: authed progress requests re-issue the cookie', async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const login = await fetch(`${base()}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'pw' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  // GET refreshes the cookie
  const get = await fetch(`${base()}/api/progress`, { headers: { cookie } });
  assert.match(get.headers.get('set-cookie') || '', new RegExp(`${COOKIE_NAME}=`));
  assert.match(get.headers.get('set-cookie') || '', /Max-Age=\d+/);

  // PUT refreshes the cookie too
  const put = await fetch(`${base()}/api/progress`, {
    method: 'PUT',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews: {}, bookmarks: {}, hidden: {} }),
  });
  assert.match(put.headers.get('set-cookie') || '', new RegExp(`${COOKIE_NAME}=`));

  // Unauthenticated request does NOT set a cookie
  const noauth = await fetch(`${base()}/api/progress`);
  assert.strictEqual(noauth.status, 401);
  assert.strictEqual(noauth.headers.get('set-cookie'), null);
});
