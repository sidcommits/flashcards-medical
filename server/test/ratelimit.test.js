const { test } = require('node:test');
const assert = require('node:assert');
const { rateLimit } = require('../lib/ratelimit');

test('allows up to max then blocks within window', () => {
  const key = 'k-' + Math.random();
  let allowed = 0;
  for (let i = 0; i < 12; i++) if (rateLimit(key, 10, 60000)) allowed++;
  assert.strictEqual(allowed, 10);
  assert.strictEqual(rateLimit(key, 10, 60000), false);
});
