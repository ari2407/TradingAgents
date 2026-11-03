# Changelog

## 1.0.0 — TradingAgents Journal

### Changed
- Repo diubah dari framework analisis trading Python/LLM menjadi aplikasi jurnal trading React/TypeScript.
- UI berbahasa Indonesia, responsif, dengan pendekatan form progresif untuk pemula.
- Distribusi web/PWA dan Android Capacitor; build APK melalui workflow referensi GitHub Actions yang dapat diaktifkan di repo.

### Added
- Penyimpanan lokal IndexedDB, banyak akun dengan mata uang terpisah, draf otomatis.
- CRUD trade, tutup posisi, biaya, kontrak, long/short, screenshot, tag, emosi, checklist, rating eksekusi.
- Dashboard, kalender, kurva ekuitas, statistik performa, breakdown, dan kalkulator risiko.
- Strategi/checklist, jurnal harian, review mingguan, ekspor Markdown.
- CSV all-or-nothing dengan pratinjau, backup JSON checksum, restore atomik, panduan dan proteksi penghapusan.
- Tema gelap, privasi tampilan, offline service worker, ikon/splash Android.
- Unit/integration tests dan Playwright termasuk offline reload dan mobile viewport.

### Notes
- Kode framework lama tetap ada dalam riwayat Git; tidak ada migrasi data otomatis.
- APK CI menggunakan kunci debug publik dan paket `.debug`, bukan rilis produksi Play Store.
- Tidak ada cloud sync, broker integration, live price, atau konversi mata uang otomatis.

Rilis framework TradingAgents sebelumnya dapat dilihat pada tag/riwayat Git proyek asal.
