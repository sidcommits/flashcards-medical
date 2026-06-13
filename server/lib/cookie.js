const crypto = require('crypto');

const COOKIE_NAME = 'fc_session';
const MAX_AGE_S = 90 * 24 * 3600;

const b64url = (s) => Buffer.from(s).toString('base64url');

function sign(payloadObj, secret) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
  if (!data || !data.exp || Date.now() > data.exp) return null;
  return data;
}

function makeSessionCookie(secret) {
  const now = Date.now();
  const token = sign({ iat: now, exp: now + MAX_AGE_S * 1000 }, secret);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_S}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

module.exports = { COOKIE_NAME, sign, verify, makeSessionCookie, clearCookie, parseCookies };
