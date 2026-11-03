import sharp from 'sharp';
import { readFile, readdir } from 'node:fs/promises';
const root = 'android/app/src/main/res';
const svg = await readFile('public/icon.svg');
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densities)) {
  const icon = await sharp(svg).resize(size, size).png().toBuffer();
  await sharp(icon).toFile(`${root}/mipmap-${density}/ic_launcher.png`);
  await sharp(icon).toFile(`${root}/mipmap-${density}/ic_launcher_round.png`);
  const canvas = Math.round(size * 2.25);
  const inner = Math.round(canvas * 0.66);
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: '#142e37' } })
    .composite([{ input: await sharp(svg).resize(inner, inner).png().toBuffer(), gravity: 'centre' }])
    .png().toFile(`${root}/mipmap-${density}/ic_launcher_foreground.png`);
}
for (const dir of await readdir(root)) {
  if (!dir.startsWith('drawable') || dir.includes('-v')) continue;
  try {
    const file = `${root}/${dir}/splash.png`; const image = sharp(file); const { width, height } = await image.metadata();
    if (!width || !height) continue;
    const size = Math.round(Math.min(width, height) * 0.3);
    await sharp({ create: { width, height, channels: 4, background: '#142e37' } })
      .composite([{ input: await sharp(svg).resize(size, size).png().toBuffer(), gravity: 'centre' }])
      .png().toFile(file);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log('Android launcher and splash assets generated.');
