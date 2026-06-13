const { test, after } = require('node:test');
const assert = require('node:assert');

process.env.COOKIE_SECRET = 'test-secret';
process.env.PASSWORD_HASH = require('../lib/password').hashPassword('pw');
process.env.PORT = '0'; // ephemeral
const { createServer } = require('../index.js');
const server = createServer();

async function listen() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server.address().port;
}
after(() => server.close());

test('GET /health returns ok', async () => {
  const port = await listen();
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { ok: true });
});
