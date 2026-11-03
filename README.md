# TradingAgents Journal

**Catat. Pahami. Berkembang.**

Jurnal trading profesional berbahasa Indonesia untuk web dan Android. Dirancang agar trader pemula bisa mulai dari catatan sederhana, lalu melengkapi detail sesuai kebutuhan — bukan mengisi puluhan kolom sebelum boleh mencatat.

Aplikasi **local-first**: data disimpan di perangkat dengan IndexedDB. Tidak perlu login, server, API key, atau koneksi broker. Setelah aset tersedia, seluruh fitur jurnal berjalan offline.

> Repo ini telah diubah dari framework analisis trading Python menjadi aplikasi jurnal trading. Kode lama tetap tersedia dalam riwayat Git. Tidak ada migrasi otomatis dari data/framework lama. Lisensi Apache-2.0 dipertahankan.

## Unduh untuk Android

**APK uji coba dibuat dari proyek Android di repo ini.** Jika build otomatis sudah diaktifkan: [unduh APK terbaru](https://github.com/ari2407/TradingAgents/releases/latest/download/TradingAgents-Journal-Android.apk) · [semua rilis & checksum](https://github.com/ari2407/TradingAgents/releases).

Workflow referensi tersedia di [`docs/ci/android.yml`](docs/ci/android.yml). Koneksi GitHub sesi ini belum memiliki izin menulis workflow, jadi salin file tersebut ke `.github/workflows/android.yml` melalui GitHub UI atau koneksi GitHub dengan izin workflow/Actions untuk mengaktifkan rilis otomatis.

1. Buka tautan APK dari browser Android.
2. Jika diminta, izinkan browser tersebut memasang aplikasi dari sumber eksternal.
3. Pasang **TradingAgents Journal**, lalu buka. Internet tidak diperlukan untuk memakai jurnal.

Paket CI adalah **APK debug/uji coba yang dapat dipasang**, bukan rilis Play Store. Application ID-nya `com.ari2407.tradingagentsjournal.debug`, terpisah dari paket produksi. Kunci pengembangan dipublikasikan agar pembaruan build CI memakai signature yang sama. Jangan gunakan kunci tersebut untuk distribusi produksi.

- Minimum Android 7.0 (API 23); gunakan Android System WebView/Chrome yang masih diperbarui.
- APK membundel aplikasi, ikon, dan font. Tidak bergantung pada CDN saat digunakan.
- Data web/PWA dan APK adalah penyimpanan terpisah. Pindahkan dengan backup JSON.
- Jika rilis belum muncul, aktifkan workflow referensi dan tunggu **Verify journal & build Android** selesai.

## Mulai dalam tiga langkah

1. **Atur akun.** Isi nama, mata uang, modal awal, dan batas risiko. Akun awal kosong tersedia otomatis.
2. **Catat trade.** Isi simbol, arah, jumlah, dan harga masuk. Stop loss, target, strategi, emosi, checklist, dan screenshot bisa ditambahkan sekarang atau nanti.
3. **Tutup dan review.** Masukkan harga/waktu keluar serta biaya aktual. Lihat hasilnya, tulis satu pelajaran, lalu evaluasi pola mingguan.

Draf trade dan jurnal tersimpan otomatis di perangkat. Tombol **Simpan** memasukkan catatan ke riwayat dan analisis.

## Fitur

| Area | Fitur |
|---|---|
| Ringkasan | P&L bersih, win rate, profit factor, saldo jurnal, kurva ekuitas, drawdown, risiko terbuka, pengingat batas rugi harian |
| Trade | Long/short, terbuka/tertutup, entry/exit rata-rata, SL/target, biaya, nilai kontrak, leverage informatif, tag, emosi, rating eksekusi |
| Dokumentasi | Alasan entry, catatan keluar, pelajaran, checklist per trade, hingga 10 screenshot per trade, pratinjau gambar |
| Daftar trade | Pencarian teks/catatan, filter status/strategi/periode/tanggal, pengurutan, pagination, detail, edit, tutup posisi, hapus dengan konfirmasi |
| Kalender | P&L per tanggal keluar, jumlah trade, hari terbaik/terburuk, detail harian, penanda posisi masuk |
| Analisis | Ekspektansi, profit factor, payoff, rata-rata win/loss, R-multiple, drawdown, biaya, disiplin checklist, breakdown strategi/instrumen/sesi/arah/emosi |
| Strategi | Rencana, timeframe, aturan risiko, checklist satu baris per aturan, contoh yang bisa disesuaikan, duplikat, arsip |
| Jurnal | Jurnal harian, emosi, rating disiplin, refleksi terpandu, review mingguan Senin–Minggu, riwayat/pencarian, ekspor Markdown |
| Risiko | Position sizing berbasis anggaran risiko, pembulatan ke bawah per lot/unit, biaya tetap, reward/risk, nosional, estimasi margin, validasi arah SL |
| Akun | Banyak akun, IDR/USD/EUR/SGD/MYR, modal awal, biaya/kontrak default, batas risiko, arsip; tidak mencampur mata uang |
| Data | Impor CSV dengan pratinjau dan validasi seluruh file, ekspor CSV, backup JSON lengkap termasuk gambar, restore terverifikasi, reset aman |
| Kenyamanan | Bahasa Indonesia, responsif ponsel/desktop, navigasi bawah, tema terang/gelap/system, samarkan nominal, panduan dalam aplikasi |
| Offline | PWA dengan precache service worker, Android native Capacitor, font/ikon lokal, tanpa permintaan API runtime |

**Tidak ada trade contoh yang dimasukkan ke performa Anda.** Dua strategi contoh diberi label jelas dan dapat diedit atau diarsipkan.

## Privasi dan keamanan data

- Tidak ada akun online, iklan, tracker, atau pengiriman jurnal ke server.
- Data utama berada di IndexedDB browser/WebView, bukan `localStorage`.
- Backup JSON mencakup akun, trade, strategi, jurnal, pengaturan, dan screenshot. Draf yang belum disimpan tidak termasuk backup.
- Backup memiliki checksum SHA-256 untuk mendeteksi kerusakan/perubahan tidak sengaja. **Checksum bukan enkripsi atau tanda tangan keamanan.**
- Restore memvalidasi struktur, referensi, dan checksum, lalu mengganti data dalam transaksi atomik. Konfirmasi eksplisit diperlukan.
- Impor CSV menolak seluruh file bila ada baris bermasalah; tidak ada impor sebagian. ID yang sudah ada dilewati.
- `allowBackup=false` pada Android. Aplikasi tidak meminta akses kontak, lokasi, kamera, atau penyimpanan luas. Pemilihan file dan berbagi backup memakai picker/menu berbagi Android.
- **Uninstall, hapus data situs, mode privat, atau kehilangan perangkat dapat menghapus data.** Buat backup rutin dan simpan salinan di tempat tepercaya.
- Samarkan nominal hanya privasi visual, bukan PIN/enkripsi. Gunakan kunci layar perangkat.

## Batasan yang disengaja

Ini jurnal, bukan broker atau penasihat investasi. Tidak ada order otomatis, harga live, sinkronisasi cloud, konversi kurs, notifikasi harga, setoran/penarikan, atau partial exit otomatis. Gunakan harga rata-rata untuk satu posisi, atau catatan terpisah tanpa menghitung jumlah/biaya dua kali.

Biaya dimasukkan manual sebagai total. Untuk forex/futures, nilai per poin harus sesuai spesifikasi kontrak dan mata uang akun. Leverage hanya memengaruhi margin, tidak mengalikan P&L dua kali. Stop loss tidak menjamin batas kerugian saat terjadi gap/slippage/likuidasi.

## Rumus utama

```text
P&L kotor = (harga keluar − harga masuk) × jumlah × nilai per poin × arah
arah: long = +1, short = −1
P&L bersih = P&L kotor − total biaya
Saldo jurnal = modal awal + seluruh P&L bersih terealisasi
Win rate = trade profit / seluruh trade closed (termasuk impas)
Profit factor = total profit kotor / total kerugian kotor
Ekspektansi = P&L bersih / jumlah trade closed
Risiko harga awal = |entry − SL awal| × jumlah × nilai per poin
R-multiple = P&L bersih / risiko harga awal
Ukuran posisi = floor((saldo × risiko% − biaya) / risiko per unit / kelipatan) × kelipatan
```

Trade tanpa SL tetap masuk P&L, tetapi tidak masuk rata-rata R. Posisi terbuka tidak mempunyai P&L mark-to-market karena tidak ada harga live. Kalender dan statistik closed memakai tanggal keluar; sesi entry memakai jam lokal perangkat.

## Jalankan secara lokal

Prasyarat: **Node.js 22.12+** dan npm.

```bash
npm ci
npm run dev
```

Buka alamat yang ditampilkan Vite. Untuk pengujian versi produksi dan PWA:

```bash
npm run build
npm run preview
```

PWA membutuhkan HTTPS atau localhost. Service worker tidak diaktifkan pada dev server biasa. Jangan membuka `index.html` dengan `file://`.

### Pengujian

```bash
npm test                 # kalkulasi, schema, CSV, IndexedDB, backup/rollback
npm run typecheck        # TypeScript strict
npx playwright install chromium
npm run test:e2e         # alur pengguna, ponsel, offline reload, backup restore
```

### Android

```bash
npm run android:sync
npm run android:open     # membutuhkan Android Studio
# atau, dengan JDK 21 + Android SDK 35:
npm run android:debug
```

Lihat [docs/ANDROID.md](docs/ANDROID.md) untuk konfigurasi SDK, CI, signing, dan pemindahan data.

## Struktur proyek

```text
src/
  components/    Shell, dialog aksesibel, form trade, grafik SVG, impor CSV
  pages/         Ringkasan, trade, kalender, analisis, strategi, jurnal, risiko, akun, pengaturan
  lib/           Schema Zod, Dexie/IndexedDB, kalkulasi, CSV, backup, format
  stores/        State live database, preferensi, notifikasi, konfirmasi
  hooks/         Status jaringan, instalasi PWA, penyimpanan persisten
  styles*.css    Design system responsif dan tema gelap
public/          Manifest dan ikon lokal
android/         Proyek native Capacitor, Gradle wrapper, resource Android
android-signing/ Kunci debug publik khusus uji coba
scripts/         Generator ikon PWA dan Android
tests/e2e/      Pengujian Playwright, termasuk mode offline
docs/ci/android.yml             Referensi workflow verifikasi dan rilis APK otomatis
docs/            Panduan pengguna, arsitektur, Android, keamanan, catatan rilis
```

Detail: [Panduan pengguna](docs/USER_GUIDE.md) · [Arsitektur](docs/ARCHITECTURE.md) · [Keamanan](docs/SECURITY.md) · [Catatan rilis](docs/RELEASE_NOTES.md).

## Lisensi dan asal proyek

Apache-2.0. Lihat [LICENSE](LICENSE) dan [NOTICE](NOTICE). Proyek awal TradingAgents berasal dari TauricResearch; aplikasi jurnal ini bukan produk resmi TauricResearch dan tidak menyiratkan dukungan atau endorsement.

**Trading mengandung risiko kehilangan modal. Aplikasi ini alat pencatatan/edukasi, bukan saran investasi atau jaminan hasil.**
