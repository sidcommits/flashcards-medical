const { test } = require('node:test');
const assert = require('node:assert');
const { sign, verify, parseCookies, makeSessionCookie, clearCookie, COOKIE_NAME } = require('../lib/cookie');

test('sign/verify round-trips and rejects tampering', () => {
  const secret = 's1';
  const token = sign({ iat: 1, exp: Date.now() + 1000 }, secret);
  assert.ok(verify(token, secret));
  assert.strictEqual(verify(token, 'other'), null);
  assert.strictEqual(verify(token + 'x', secret), null);
});

test('verify rejects expired', () => {
  const token = sign({ iat: 1, exp: Date.now() - 1 }, 's');
  assert.strictEqual(verify(token, 's'), null);
});

test('parseCookies extracts named cookie', () => {
  assert.strictEqual(parseCookies(`a=1; ${COOKIE_NAME}=xyz; b=2`)[COOKIE_NAME], 'xyz');
});

test('makeSessionCookie has security flags; clearCookie expires', () => {
  assert.match(makeSessionCookie('s'), /HttpOnly/);
  assert.match(makeSessionCookie('s'), /Secure/);
  assert.match(makeSessionCookie('s'), /SameSite=Lax/);
  assert.match(clearCookie(), /Max-Age=0/);
});
