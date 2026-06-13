import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const file = 'out/sw.js';
if (!existsSync(file)) {
  console.log('version-sw: out/sw.js not found, skipping');
  process.exit(0);
}
let id;
try {
  id = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  id = String(Date.now());
}
const src = readFileSync(file, 'utf8');
const out = src.replace(/fc-v1/g, `fc-${id}`);
writeFileSync(file, out);
console.log('version-sw: stamped out/sw.js cache version -> fc-' + id);
