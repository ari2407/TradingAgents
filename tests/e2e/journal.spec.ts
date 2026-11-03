import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function open(page: Page, path = '/') { await page.goto(`/#${path}`); await expect(page.locator('.main-content h1')).toBeVisible(); }
async function setupAccount(page: Page) {
  await open(page, '/accounts'); await page.getByRole('button', { name: 'Tambah akun', exact: true }).first().click();
  const dialog = page.getByRole('dialog'); await dialog.getByLabel(/Nama akun/).fill('Akun Uji');
  await dialog.getByLabel(/Modal awal/).fill('10000000'); await dialog.getByLabel(/Batas rugi bersih harian/).fill('100000');
  await dialog.getByRole('button', { name: 'Buat akun', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Pilih akun trading')).toContainText('Akun Uji');
}
async function addClosedTrade(page: Page, symbol = 'BBCA') {
  await open(page, '/trades?new=1'); const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Simbol trading/).fill(symbol); await dialog.getByLabel(/Jumlah \/ ukuran posisi/).fill('100');
  await dialog.getByLabel(/^Harga masuk/).fill('1000'); await dialog.getByLabel(/^Stop loss/).fill('950'); await dialog.getByLabel(/^Target \/ take profit/).fill('1200');
  await dialog.getByRole('button', { name: 'Sudah ditutup' }).click(); await dialog.getByLabel(/^Harga keluar/).fill('1100'); await dialog.getByLabel(/^Total biaya/).fill('5000');
  await dialog.getByRole('button', { name: 'Simpan trade', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await expect(page.locator('.trade-overview-strip')).toContainText('1 total trade');
}

test('new user can set up, record, close, inspect and persist a complete trade', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page); await expect(page.getByRole('heading', { name: 'Catat. Pahami. Berkembang.' })).toBeVisible();
  await expect(page.getByText('0 dari 3 langkah selesai')).toBeVisible(); await setupAccount(page);
  await open(page, '/strategies?new=1'); let dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Nama strategi/).fill('Setup Uji'); await dialog.getByLabel(/Checklist entry/).fill('Tren jelas\nSL sudah jelas');
  await dialog.getByRole('button', { name: 'Simpan strategi' }).click(); await expect(dialog).not.toBeVisible();
  await open(page, '/trades?new=1'); dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Simbol trading/).fill('BBCA'); await dialog.getByLabel(/Jumlah \/ ukuran posisi/).fill('100'); await dialog.getByLabel(/^Harga masuk/).fill('1000');
  await dialog.getByLabel(/^Stop loss/).fill('950'); await dialog.getByLabel(/^Target \/ take profit/).fill('1200');
  await dialog.getByRole('button', { name: /Rencana, checklist & emosi/ }).click();
  await dialog.getByLabel('Strategi / setup').selectOption({ label: 'Setup Uji' });
  await dialog.getByLabel('Tren jelas', { exact: true }).check(); await dialog.getByLabel('SL sudah jelas', { exact: true }).check();
  await dialog.getByLabel('Alasan entry / rencana awal').fill('Breakout terkonfirmasi, risiko terukur.');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'chart.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6u0sAAAAASUVORK5CYII=', 'base64') });
  await expect(dialog.getByText('chart.png', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Simpan trade', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: /BBCA Saham/ }).click(); dialog = page.getByRole('dialog'); await expect(dialog.getByText('Posisi terbuka', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tutup posisi' }).click(); dialog = page.getByRole('dialog');
  await dialog.getByLabel('Harga keluar aktual').fill('1100'); await dialog.getByLabel('Total biaya aktual').fill('5000'); await dialog.getByLabel('Catatan keluar').fill('Keluar sesuai rencana.');
  await dialog.getByRole('button', { name: 'Simpan hasil trade' }).click(); await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: /BBCA Saham/ }).click(); dialog = page.getByRole('dialog');
  await expect(dialog.locator('.detail-hero')).toContainText('5.000'); await expect(dialog.getByText('+1 R', { exact: true })).toBeVisible();
  await expect(dialog.getByAltText('chart.png')).toBeVisible(); await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  await open(page, '/analytics'); await expect(page.locator('.analytics-context')).toContainText('1 trade closed'); await expect(page.locator('.stats-grid')).toContainText('5.000');
  await page.reload(); await expect(page.locator('.stats-grid')).toContainText('5.000');
  await open(page); await expect(page.getByText('3 dari 3 langkah selesai')).toHaveCount(0); expect(errors).toEqual([]);
});

test('risk calculator rejects wrong stop, sizes a valid plan, and prefills a trade', async ({ page }) => {
  await setupAccount(page); await open(page, '/tools');
  await page.getByLabel(/^Harga entry/).fill('1000'); await page.getByLabel(/^Harga stop loss/).fill('1100');
  await expect(page.getByText(/stop loss harus di bawah/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Lengkapi rencana terlebih dahulu' })).toBeDisabled();
  await page.getByLabel(/^Harga stop loss/).fill('950'); await page.getByLabel(/^Harga target \/ take profit/).fill('1200');
  await expect(page.locator('.position-result h2')).toContainText('2.000'); await expect(page.locator('.result-metrics')).toContainText('100.000');
  await page.getByRole('button', { name: 'Gunakan dalam catatan trade' }).click(); const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel(/^Harga masuk/)).toHaveValue('1000'); await expect(dialog.getByLabel(/Jumlah \/ ukuran posisi/)).toHaveValue('2000');
  await dialog.getByLabel(/Simbol trading/).fill('BBRI'); await dialog.getByRole('button', { name: 'Simpan trade', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await expect(page.locator('.trade-overview-strip')).toContainText('1 terbuka');
});

test('daily and weekly journals save, survive reload, and keep separate histories', async ({ page }) => {
  await open(page, '/notes'); await page.getByLabel(/Ceritakan trading Anda hari ini/).fill('Hari ini saya menunggu konfirmasi dan tidak FOMO.');
  await page.getByLabel(/Bagaimana perasaan Anda hari ini/).selectOption('tenang'); await page.getByRole('button', { name: 'Disiplin 4 dari 5' }).click();
  await page.getByRole('button', { name: 'Simpan jurnal', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Jurnal tersimpan' })).toBeVisible();
  await page.reload(); await expect(page.getByLabel(/Ceritakan trading Anda hari ini/)).toHaveValue('Hari ini saya menunggu konfirmasi dan tidak FOMO.');
  await page.getByRole('button', { name: 'Review mingguan' }).click(); await page.getByLabel(/Apa pola paling penting minggu ini/).fill('Setup yang disiplin lebih mudah dievaluasi.');
  await page.getByRole('button', { name: 'Simpan jurnal', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Jurnal tersimpan' })).toBeVisible();
  await page.getByRole('button', { name: 'Jurnal harian', exact: true }).click(); await expect(page.getByLabel(/Ceritakan trading Anda hari ini/)).toHaveValue('Hari ini saya menunggu konfirmasi dan tidak FOMO.');
});

test('CSV validates before import, skips duplicate IDs, and exports the active account', async ({ page }) => {
  await setupAccount(page); await open(page, '/trades'); await page.getByRole('button', { name: 'Impor CSV', exact: true }).click(); const dialog = page.getByRole('dialog');
  const csv = 'id,symbol,market,direction,openedAt,entryPrice,quantity,fees\nimport-1,BBCA,Saham,long,2026-11-03T09:00,1000,100,0\n';
  await dialog.locator('input[type=file]').setInputFiles({ name: 'trades.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(dialog.getByText('Validasi selesai.', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Impor 1 trade', exact: true }).click(); await expect(dialog).not.toBeVisible(); await expect(page.locator('.trade-overview-strip')).toContainText('1 total trade');
  await page.getByRole('button', { name: 'Impor CSV', exact: true }).click(); await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'trades.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('dialog').locator('.import-counts')).toContainText('1duplikat dilewati'); await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Ekspor CSV', exact: true }).click(); const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain('.csv'); const content = await readFile((await download.path())!, 'utf8'); expect(content).toContain('BBCA'); expect(content).toContain('Akun Uji');
});

test('JSON backup restores all data only after explicit replacement confirmation', async ({ page }) => {
  await setupAccount(page); await addClosedTrade(page); await open(page, '/settings');
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Backup sekarang', exact: true }).click(); const download = await downloadEvent;
  const path = (await download.path())!; const backup = JSON.parse(await readFile(path, 'utf8')); expect(backup.trades.length).toBe(1); expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole('button', { name: 'Reset data', exact: true }).click(); let dialog = page.getByRole('dialog'); await dialog.getByRole('textbox').fill('HAPUS'); await dialog.getByRole('button', { name: 'Hapus semua data', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await open(page, '/trades'); await expect(page.getByRole('heading', { name: 'Trade pertama, langkah awal yang baik' })).toBeVisible();
  await open(page, '/settings'); await page.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  dialog = page.getByRole('dialog'); await expect(dialog.getByRole('heading', { name: 'Backup siap dipulihkan' })).toBeVisible(); await dialog.getByRole('button', { name: 'Ganti data perangkat' }).click();
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Ganti seluruh data di perangkat?' }); await expect(confirmation.getByRole('button', { name: 'Ganti dan pulihkan' })).toBeDisabled();
  await confirmation.getByRole('textbox').fill('GANTI'); await confirmation.getByRole('button', { name: 'Ganti dan pulihkan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible(); await open(page, '/trades'); await expect(page.locator('.trade-overview-strip')).toContainText('1 total trade'); await expect(page.getByLabel('Pilih akun trading')).toContainText('Akun Uji');
});

test('installed PWA reloads and records trades and notes fully offline', async ({ page, context }) => {
  await open(page); await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  const external: string[] = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:')) external.push(request.url()); });
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'Catat. Pahami. Berkembang.' })).toBeVisible(); await expect(page.locator('.offline-banner')).toBeVisible();
  await addClosedTrade(page, 'OFFLINE'); await open(page, '/notes'); await page.getByLabel(/Ceritakan trading Anda hari ini/).fill('Tetap mencatat tanpa internet.'); await page.getByRole('button', { name: 'Simpan jurnal', exact: true }).click();
  await page.reload(); await expect(page.getByLabel(/Ceritakan trading Anda hari ini/)).toHaveValue('Tetap mencatat tanpa internet.');
  for (const route of ['/analytics', '/calendar', '/strategies', '/tools', '/accounts', '/settings']) { await open(page, route); await expect(page.locator('.main-content')).toBeVisible(); }
  expect(external).toEqual([]); await context.setOffline(false); await open(page, '/trades'); await page.reload(); await expect(page.locator('.trade-overview-strip')).toContainText('1 total trade');
});

test('mobile navigation, editor and every page fit a narrow Android viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page); await expect(page.getByRole('navigation', { name: 'Navigasi ponsel' })).toBeVisible();
  await page.getByRole('button', { name: 'Lainnya', exact: true }).click(); await page.locator('.more-sheet').getByRole('link', { name: 'Kalkulator risiko' }).click(); await expect(page.getByRole('heading', { name: 'Kalkulator risiko', exact: true })).toBeVisible();
  for (const route of ['/', '/trades', '/calendar', '/analytics', '/strategies', '/notes', '/tools', '/accounts', '/settings']) {
    await open(page, route); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow on ${route}`).toBe(true);
  }
  await page.getByRole('button', { name: 'Catat trade baru', exact: true }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true); await dialog.getByLabel(/Simbol trading/).fill('MOBILE'); await dialog.getByLabel(/Jumlah \/ ukuran posisi/).fill('1'); await dialog.getByLabel(/^Harga masuk/).fill('100');
  await dialog.getByRole('button', { name: 'Simpan trade', exact: true }).click(); await expect(dialog).not.toBeVisible(); await expect(page.locator('.mobile-trade-list')).toContainText('MOBILE');
});

test('privacy, theme, draft recovery and invalid backup leave saved data intact', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Sembunyikan nominal', exact: true }).click(); await expect(page.locator('.app-layout')).toHaveAttribute('data-privacy', 'true');
  await page.getByRole('button', { name: 'Ganti tema terang atau gelap' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await open(page, '/trades?new=1'); let dialog = page.getByRole('dialog'); await dialog.getByLabel(/Simbol trading/).fill('DRAFT'); await dialog.getByLabel(/^Harga masuk/).fill('100'); await dialog.getByLabel(/Jumlah \/ ukuran posisi/).fill('1');
  await expect(dialog.getByText('Draf otomatis tersimpan lokal')).toBeVisible(); await dialog.getByRole('button', { name: 'Nanti saja' }).click();
  await open(page); await open(page, '/trades?new=1'); dialog = page.getByRole('dialog'); await expect(dialog.getByLabel(/Simbol trading/)).toHaveValue('DRAFT'); await dialog.getByRole('button', { name: 'Buang draf', exact: true }).click();
  await page.getByRole('dialog').filter({ hasText: 'Buang draf ini?' }).getByRole('button', { name: 'Buang draf', exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await open(page, '/settings'); await page.locator('input[accept=".json,application/json"]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"wrong"}') });
  await expect(page.getByRole('alert').filter({ hasText: 'Backup tidak valid' })).toBeVisible(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); await expect(page.locator('.app-layout')).toHaveAttribute('data-privacy', 'true');
});
