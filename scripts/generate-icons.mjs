import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const svg = 'public/icon.svg';
await mkdir('public', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`);
}
await sharp(svg).resize(400, 400).extend({ top: 56, bottom: 56, left: 56, right: 56, background: '#142e37' }).png().toFile('public/icon-maskable.png');
console.log('PWA icons generated.');
