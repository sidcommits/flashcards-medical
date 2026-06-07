import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'public', 'decks');
const files = readdirSync(dir).filter(
  (f) => /\.(csv|xlsx)$/i.test(f) && f !== 'index.json'
);
writeFileSync(join(dir, 'index.json'), JSON.stringify({ files }, null, 2));
console.log('Wrote public/decks/index.json ->', files);
