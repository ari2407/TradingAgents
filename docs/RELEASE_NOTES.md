# TradingAgents Journal 1.0.0

Rilis awal aplikasi jurnal trading lokal berbahasa Indonesia, menggantikan framework Python pada repo ini.

## Termasuk dalam rilis

- Dashboard, daftar trade, kalender, analisis performa, strategi/checklist, jurnal harian/mingguan, kalkulator risiko, banyak akun, dan pengaturan.
- Trade long/short, terbuka/tertutup, biaya, nilai kontrak, R-multiple, screenshot, emosi, tag, dan penilaian eksekusi.
- Draf otomatis, pencarian/filter, tema gelap, tampilan ponsel, dan panduan pemula.
- Impor/ekspor CSV, backup JSON lengkap dengan checksum, restore atomik, dan reset dengan konfirmasi.
- PWA offline dan proyek Android Capacitor.
- Workflow CI untuk pengujian, build APK debug yang dapat dipasang, checksum, artifact, dan GitHub Release.

## Penting

- APK adalah **uji coba/debug**, bukan rilis Play Store. Paket: `com.ari2407.tradingagentsjournal.debug`.
- Data lokal tidak dienkripsi. Backup sebelum uninstall, hapus data situs, atau pindah perangkat.
- Tidak ada harga live, order broker, cloud sync, konversi kurs, atau partial exit otomatis.
- Strategi contoh bukan rekomendasi trading. Tidak ada data performa contoh yang dimasukkan otomatis.
- Web/PWA dan APK memiliki penyimpanan terpisah; pindahkan dengan backup JSON.

## Verifikasi

CI menjalankan TypeScript/build, 41 unit/integration tests, 8 alur browser termasuk offline, audit dependensi runtime, Android lint/assemble, dan verifikasi signature APK. Hasil aktual setiap build tersedia di tab Actions.
