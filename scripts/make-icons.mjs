import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#7c2b3e"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="900"
        font-size="300" fill="#f4efe6">F</text>
</svg>`;

const jobs = [
  ['public/icons/icon-512.png', svg(false), 512],
  ['public/icons/icon-192.png', svg(false), 192],
  ['public/icons/maskable-512.png', svg(true), 512],
  ['public/icons/apple-touch-icon.png', svg(false), 180],
];
for (const [out, s, size] of jobs) {
  await sharp(Buffer.from(s)).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}
