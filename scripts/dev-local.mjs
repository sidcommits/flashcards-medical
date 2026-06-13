// Local full-stack dev: runs the sync service + Next dev together so the
// login/sync flow works end-to-end on http://localhost:3000.
//
//   npm run dev:local      # password: "localtest" (override with FC_DEV_PASSWORD)
//
// Progress is stored at /tmp/fc-progress-local.json (throwaway). This is a
// LOCAL convenience only — production uses the real pm2 service + nginx.
import { spawn, execSync } from 'node:child_process';

const pw = process.env.FC_DEV_PASSWORD || 'localtest';
const hash = execSync(`node server/scripts/hash-password.js ${JSON.stringify(pw)}`).toString().trim();

const syncEnv = {
  ...process.env,
  PORT: '3010',
  COOKIE_SECRET: 'localdevsecret-not-for-prod',
  PASSWORD_HASH: hash,
  FC_DATA_FILE: '/tmp/fc-progress-local.json',
};

const sync = spawn('node', ['server/index.js'], { env: syncEnv, stdio: 'inherit' });
const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });

console.log(`\n  ▶ Local flashcards starting — open http://localhost:3000\n    password: ${pw}\n`);

function shutdown() {
  sync.kill();
  dev.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
dev.on('exit', shutdown);
sync.on('exit', shutdown);
