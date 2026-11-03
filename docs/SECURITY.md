# Keamanan dan privasi

## Model ancaman

Aplikasi menyimpan catatan keuangan pribadi secara lokal. Tidak ada server aplikasi yang menerima jurnal. Risiko utama adalah akses ke perangkat/browser, file backup yang dibagikan, kehilangan perangkat, penghapusan data situs, dan APK dari sumber tidak tepercaya.

## Yang dilakukan aplikasi

- Validasi input dan file sebelum write; transaksi untuk perubahan terkait.
- React merender teks catatan sebagai teks, bukan HTML.
- CSV export menetralkan awalan formula spreadsheet.
- Backup memverifikasi schema, referensi, ukuran gambar, dan checksum sebelum restore.
- Restore/reset meminta konfirmasi eksplisit dengan pengetikan kata konfirmasi.
- Tidak ada eval terhadap isi catatan/backup, credential broker, atau API key.
- Android menonaktifkan cloud backup otomatis dan cleartext HTTP.
- File native dibagikan melalui FileProvider, bukan penyimpanan publik luas.
- Dependensi runtime diaudit pada CI.

## Yang tidak dijanjikan

- Data IndexedDB dan backup JSON **tidak dienkripsi oleh aplikasi**.
- Checksum SHA-256 bukan tanda tangan kriptografis dan tidak membuktikan asal file.
- Samarkan nominal bukan PIN, autentikasi, atau perlindungan terhadap orang yang membuka perangkat.
- Penyimpanan persisten bukan jaminan data tidak akan dihapus.
- APK debug memakai kunci publik dan hanya untuk uji coba/distribusi terbatas.
- Tidak ada klaim kepatuhan regulasi keuangan atau sertifikasi keamanan independen.

## Praktik pengguna

Gunakan kunci layar, perbarui OS/WebView/browser, unduh APK hanya dari repo resmi, dan simpan backup di tempat tepercaya. Jangan membagikan JSON berisi data keuangan pribadi. Verifikasi restore sebelum menghapus perangkat lama.

## Melaporkan masalah

Hubungi pemilik repo melalui GitHub. Jangan menyertakan jurnal asli, screenshot akun, password, token, atau kunci pribadi dalam laporan publik. Buat reproduksi dengan data sintetis. Jika repo menyediakan GitHub private vulnerability reporting, gunakan fitur tersebut.
