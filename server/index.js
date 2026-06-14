const http = require('http');
const { verifyPassword } = require('./lib/password');
const { makeSessionCookie, clearCookie, parseCookies, verify, COOKIE_NAME } = require('./lib/cookie');
const { readDoc, writeDoc } = require('./lib/store');
const { mergeDoc, emptyDoc } = require('./lib/merge');
const { rateLimit } = require('./lib/ratelimit');
const { insertEvents } = require('./lib/eventstore');

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body == null ? '' : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve(null); } });
    req.on('close', () => resolve(null));
  });
}

function authed(req, secret) {
  return !!verify(parseCookies(req.headers.cookie)[COOKIE_NAME], secret);
}

function createServer() {
  const SECRET = process.env.COOKIE_SECRET;
  const PASSWORD_HASH = process.env.PASSWORD_HASH;
  if (!SECRET || !PASSWORD_HASH) throw new Error('Missing COOKIE_SECRET or PASSWORD_HASH');

  return http.createServer(async (req, res) => {
    try {
      const url = req.url.split('?')[0];
      const ip = req.socket.remoteAddress || 'unknown';

      if (req.method === 'POST' && url === '/api/login') {
        if (!rateLimit('login:' + ip)) return send(res, 429, { error: 'too many attempts' });
        const body = await readBody(req);
        if (!body || typeof body.password !== 'string') return send(res, 400, { error: 'bad request' });
        if (!verifyPassword(body.password, PASSWORD_HASH)) return send(res, 401, { error: 'wrong password' });
        return send(res, 200, { ok: true }, { 'Set-Cookie': makeSessionCookie(SECRET) });
      }

      if (req.method === 'POST' && url === '/api/logout') {
        return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
      }

      if (url === '/_verify') {
        return authed(req, SECRET) ? send(res, 200, { ok: true }) : send(res, 401, { error: 'unauthorized' });
      }

      if (url === '/api/progress') {
        if (!authed(req, SECRET)) return send(res, 401, { error: 'unauthorized' });
        // Sliding session: refresh the cookie on every sync so an actively-used
        // session never expires (she logs in once and stays in).
        const refresh = { 'Set-Cookie': makeSessionCookie(SECRET) };
        if (req.method === 'GET') return send(res, 200, readDoc(), refresh);
        if (req.method === 'PUT') {
          const body = await readBody(req);
          if (body === null) return send(res, 400, { error: 'bad json' });
          const next = body.reset === true
            ? { ...emptyDoc(), resetAt: Date.now() }
            : mergeDoc(readDoc(), {
                reviews: body.reviews || {},
                bookmarks: body.bookmarks || {},
                hidden: body.hidden || {},
                examDate: body.examDate ?? null,
                goalDays: body.goalDays || {},
              });
          writeDoc(next);
          return send(res, 200, next, refresh);
        }
        return send(res, 405, { error: 'method not allowed' });
      }

      if (req.method === 'POST' && url === '/api/events') {
        if (!authed(req, SECRET)) return send(res, 401, { error: 'unauthorized' });
        const refresh = { 'Set-Cookie': makeSessionCookie(SECRET) };
        const body = await readBody(req);
        if (body === null || !Array.isArray(body.events)) return send(res, 400, { error: 'bad json' }, refresh);
        let inserted;
        try {
          inserted = insertEvents(body.events);
        } catch (e) {
          console.error('events insert', e);
          return send(res, 500, { error: 'store' }, refresh);
        }
        if (inserted < 0) return send(res, 503, { error: 'log unavailable' }, refresh);
        return send(res, 200, { ok: true, inserted }, refresh);
      }

      if (url === '/health') return send(res, 200, { ok: true });
      return send(res, 404, { error: 'not found' });
    } catch (err) {
      console.error('handler error', err);
      if (!res.headersSent) send(res, 500, { error: 'internal' });
    }
  });
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3010);
  createServer().listen(PORT, '127.0.0.1', () => console.log('flashcards-sync on 127.0.0.1:' + PORT));
}

module.exports = { createServer };
