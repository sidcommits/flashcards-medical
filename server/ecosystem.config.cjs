// pm2 config for the flashcards-sync service.
// Secrets live in /opt/flashcards-sync/.env (NOT committed); this loads them at
// start time. Deployed to the VPS via the GitHub Actions rsync (which excludes
// .env so the server-side secrets are preserved).
const fs = require('fs');
const path = require('path');

const env = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

module.exports = {
  apps: [{
    name: 'flashcards-sync',
    script: 'index.js',
    cwd: __dirname,
    node_args: '--disable-warning=ExperimentalWarning',
    env,
  }],
};
