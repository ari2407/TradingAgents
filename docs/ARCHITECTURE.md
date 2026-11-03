# Arsitektur dan keputusan desain

## Tujuan

Jurnal harus mengurangi pekerjaan, bukan menambahnya. Form memulai dari field minimum; detail lanjutan dibuka sesuai kebutuhan. Tidak ada ketergantungan pada API pasar untuk menulis atau membaca jurnal.

## Stack

- React 19 + TypeScript strict + Vite 7.
- HashRouter agar deep link bekerja pada hosting statis dan WebView tanpa rewrite server.
- Dexie 4 di atas IndexedDB; `dexie-react-hooks` membuat UI mengikuti perubahan lokal.
- Zod 4 untuk batas data, tanggal, referensi, dan validasi file.
- Papa Parse untuk CSV dengan quoted fields, newline, delimiter otomatis, dan proteksi formula export.
- Lucide dan font variabel lokal; grafik SVG ringan tanpa library chart eksternal.
- vite-plugin-pwa/Workbox untuk precache aset produksi.
- Capacitor 7 untuk Android, Filesystem dan Share untuk backup native.

## Model data

Tabel: `accounts`, `trades`, `strategies`, `notes`, `attachments`, `settings`, `drafts`.

- Setiap trade dan note memiliki `accountId`.
- Mata uang milik akun. Tidak ada agregasi lintas mata uang atau konversi kurs implisit.
- Trade closed ditandai oleh pasangan `exitPrice` dan `closedAt` yang valid.
- Biaya adalah total aktual/estimasi per trade. `multiplier` mengalikan P&L; `leverage` hanya informatif untuk margin.
- Checklist disalin ke trade saat strategi dipilih. Riwayat tidak berubah ketika strategi diedit.
- Gambar disimpan sebagai data URL tervalidasi. Trade memiliki daftar ID lampiran; penghapusan trade/penghapusan lampiran saat edit dilakukan dalam transaksi.
- Note memiliki kunci gabungan akun+jenis+tanggal mulai. Minggu dimulai Senin.
- Draf disimpan terpisah agar tidak mencemari statistik atau backup data tersimpan.
- Strategi/akun yang masih dipakai dapat diarsipkan, bukan dihapus paksa.

## Transaksi dan pemulihan

Inisialisasi akun default dilakukan dalam transaksi. Penyimpanan trade+lampiran, penghapusan trade+lampiran, penggantian akun aktif saat akun dihapus, dan restore seluruh tabel memakai transaksi Dexie.

Backup JSON memiliki versi schema, waktu ekspor, dan SHA-256 atas representasi canonical data (key object diurutkan, nilai undefined diabaikan seperti JSON). Restore memvalidasi schema dan seluruh referensi sebelum transaksi. Kegagalan write menggulung perubahan. Checksum hanya mendeteksi kerusakan, bukan membuktikan identitas pengirim.

CSV diproses sebagai pratinjau. Bila ada error, tidak ada write. Commit memeriksa ulang ID dalam transaksi untuk mengurangi impor ganda. Ekspor menyertakan ID agar reimport dapat melewatinya.

## Offline

Semua perhitungan dan query berjalan lokal. Tidak ada fetch harga, autentikasi, telemetry, atau font CDN. Service worker menyimpan HTML, JS, CSS, ikon, dan font hasil build. Aplikasi tidak memakai service worker di native karena seluruh aset sudah dibundel APK.

Status jaringan bukan indikator keamanan data. Data tetap lokal baik online maupun offline. Penyimpanan persisten dapat diminta melalui Settings, tetapi keputusan akhir ada pada browser. Backup tetap diperlukan.

## Perhitungan

Fungsi murni berada di `src/lib/calculations.ts` dan diuji tanpa UI. P&L memakai selisih harga, arah, jumlah, nilai per poin, lalu biaya. Win rate memasukkan impas dalam denominator. R memakai risiko harga awal tanpa biaya. Posisi terbuka tidak memiliki P&L mark-to-market.

Position calculator menolak arah SL yang salah dan membulatkan jumlah ke bawah. Biaya model kalkulator adalah total tetap; biaya variabel per unit belum dimodelkan.

## Aksesibilitas dan UX

Dialog memiliki focus trap, Escape, pengembalian fokus, dan nama aksesibel. Form memakai label terhubung dan deskripsi/error `aria-describedby`. Tombol ikon memiliki nama. Toast memakai live region. Tema menghormati pengaturan pengguna; animasi mengurangi gerak bila diminta sistem.

Ponsel menggunakan navigasi bawah dan form yang dapat digulung. Tabel berubah menjadi kartu. Nominal dapat disamarkan, tetapi fitur ini tidak dianggap sebagai kontrol keamanan.

## Batasan skalabilitas

UI memuat koleksi akun aktif dari IndexedDB untuk reaktivitas sederhana. Schema membatasi 100.000 trade dan CSV 10.000 baris per impor, tetapi dataset sangat besar tetap memerlukan pengujian performa perangkat. Belum ada virtualisasi tabel, worker analisis, atau sinkronisasi multi-device. Lampiran dibatasi 5 MB per gambar dan 10 per trade.

## Pengujian

- Unit: P&L long/short, biaya, kontrak, R, RR, drawdown, win rate, profit factor, grouping, kalender, sizing.
- Integrasi IndexedDB: CRUD, cascade lampiran, proteksi akun, note unik, backup checksum, restore atomik/rollback.
- CSV: round-trip, optional columns, quoted newline, duplicate ID, currency mismatch, all-or-nothing, formula injection.
- Playwright: onboarding, strategi/checklist, screenshot, tutup posisi, kalkulator ke form, jurnal, CSV, backup/reset/restore, offline reload dan tulis, viewport 390 px, draf, tema/privasi.
- CI (workflow referensi di docs/ci): typecheck/build, unit, audit dependensi runtime, browser, Android assembleDebug/lintDebug, verifikasi signature APK.
