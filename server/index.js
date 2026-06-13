const http = require('http');

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body == null ? '' : JSON.stringify(body));
}

function createServer() {
  return http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url === '/health') return send(res, 200, { ok: true });
    return send(res, 404, { error: 'not found' });
  });
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3010);
  createServer().listen(PORT, '127.0.0.1', () =>
    console.log('flashcards-sync on 127.0.0.1:' + PORT)
  );
}

module.exports = { createServer };
