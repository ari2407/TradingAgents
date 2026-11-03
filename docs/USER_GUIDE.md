# Panduan TradingAgents Journal

## 1. Siapkan akun

Buka **Akun trading → Tambah akun**, atau edit akun awal.

- **Nama akun:** pilih nama yang mudah dibedakan, misalnya “Saham pemula” atau “Demo forex”.
- **Mata uang:** dipilih sekali. Akun yang sudah punya trade/jurnal tidak dapat mengganti mata uang agar riwayat tidak salah label.
- **Modal awal:** saldo sebelum trade yang dicatat. Boleh 0, tetapi return persentase tidak dapat dihitung sampai modal diisi.
- **Risiko per trade:** persentase saldo jurnal yang dijadikan acuan. Angka 1 berarti 1%, bukan 100%.
- **Batas rugi bersih harian:** pengingat berbasis hasil closed hari ini. Profit pada hari yang sama dapat mengurangi rugi bersih. Ini bukan pemblokir order.
- **Biaya default:** estimasi total biaya satu trade, bukan persentase. Bisa diubah per trade.
- **Nilai per poin:** 1 untuk saham/crypto biasa; ikuti kontrak broker untuk instrumen lain.

Pilih akun aktif dari bilah atas. Semua halaman mengikuti akun tersebut. Mata uang tidak pernah dijumlahkan lintas akun. Arsipkan akun untuk menyembunyikannya tanpa menghapus riwayat.

## 2. Catat posisi terbuka

Klik **Catat trade**. Kolom wajib hanya akun, pasar, simbol, arah, waktu masuk, jumlah, dan harga masuk.

- **Long/Beli:** mengharapkan harga naik.
- **Short/Jual:** mengharapkan harga turun.
- **Jumlah:** unit sesuai instrumen: lembar saham, koin, atau unit kontrak. Untuk saham IDX, 1 lot umumnya 100 lembar; aplikasi menyimpan jumlah unit, bukan jumlah lot.
- **Stop loss:** rencana harga saat analisis dianggap salah. Sangat disarankan, tetapi tidak wajib untuk menyimpan catatan.
- **Target:** rencana keluar profit. Reward/risk hanya ditampilkan bila arah SL dan target valid.

Bagian **Rencana, checklist & emosi** bersifat opsional. Pilih strategi untuk menyalin checklist-nya ke trade. Checklist trade disimpan sebagai snapshot; mengubah strategi nanti tidak mengubah checklist lama.

Tambahkan alasan entry, tag, emosi, rating eksekusi, dan screenshot. Rating menilai disiplin, bukan profit. Gambar PNG/JPG/WebP maksimal 5 MB per file, maksimal 10 file per trade.

Draf disimpan otomatis. **Nanti saja** menutup form tanpa membuang draf. **Buang draf** meminta konfirmasi. **Simpan trade** memasukkan data ke riwayat.

## 3. Tutup posisi

Buka trade → **Tutup posisi**. Isi harga keluar rata-rata, waktu keluar, total biaya aktual, dan catatan. Anda juga dapat mengedit trade dan memilih **Sudah ditutup**.

Menutup catatan tidak mengirim order. Broker tetap harus dioperasikan secara terpisah. Harga dan biaya tidak diverifikasi otomatis.

Untuk entry/exit bertahap, gunakan harga rata-rata dan total biaya aktual. Bila mencatat beberapa exit sebagai trade terpisah, bagi jumlah dan biaya dengan benar agar tidak dihitung ganda.

## 4. Pahami hasil

- **Laba/rugi bersih:** hasil closed setelah biaya.
- **Saldo jurnal:** modal awal + P&L closed sepanjang waktu. Bukan saldo live broker.
- **Win rate:** jumlah trade profit dibagi semua trade closed. Impas termasuk pembagi.
- **Profit factor:** profit kotor dibagi kerugian kotor. Nilai di atas 1 berarti profit kotor lebih besar, bukan jaminan strategi menguntungkan setelah semua biaya tersembunyi.
- **Ekspektansi:** rata-rata P&L bersih per trade closed.
- **R-multiple:** hasil bersih dibagi risiko harga awal. SL yang hilang, sama dengan entry, atau di sisi salah tidak menghasilkan R.
- **Drawdown:** penurunan dari puncak ekuitas terealisasi. Bukan penurunan intraday atau floating loss.
- **Disiplin checklist:** persentase trade closed yang mencentang seluruh item, hanya untuk trade yang memiliki checklist.

Breakdown emosi/sesi bersifat deskriptif. Jumlah sampel kecil dapat menyesatkan. Sesi entry: pagi 07–14, siang 14–21, malam 21–07, menurut jam lokal perangkat.

## 5. Kalender dan jurnal

Kalender mengelompokkan hasil pada **tanggal keluar lokal**. Trade lintas hari tidak dihitung dua kali. Titik biru menandai posisi masuk pada tanggal tersebut.

Jurnal harian membantu mencatat konteks yang tidak terlihat di angka. Review mingguan dimulai Senin dan menyediakan ringkasan trade closed minggu itu, refleksi, dan rencana konkret. Satu catatan harian dan satu catatan mingguan per akun/tanggal mulai; menyimpan ulang memperbarui catatan, bukan membuat duplikat.

Draf jurnal otomatis tersimpan. Tombol unduh menghasilkan Markdown untuk catatan yang sedang dibuka. Backup JSON tetap merupakan cara utama memindahkan seluruh data.

## 6. Kalkulator risiko

Masukkan saldo, risiko %, entry, SL, target, biaya total, nilai per poin, kelipatan unit, dan leverage.

- Anggaran risiko = saldo × risiko %.
- Biaya tetap dikurangkan dari anggaran sebelum menghitung jumlah.
- Jumlah dibulatkan **ke bawah** ke kelipatan yang dipilih.
- Bila satu lot melebihi anggaran, hasilnya 0. Jangan membulatkan naik hanya agar bisa entry.
- SL long harus di bawah entry; SL short harus di atas entry.
- Nosional dan margin adalah estimasi. Margin bukan kerugian maksimum.
- Tombol **Gunakan dalam catatan trade** menyalin angka ke form trade bila tidak ada draf baru yang sedang tersimpan. Draf yang ada tetap diprioritaskan agar tidak tertimpa.

Model tidak memperhitungkan slippage, gap, funding, likuidasi, pajak progresif, atau biaya persentase yang berubah terhadap jumlah. Masukkan estimasi biaya yang memadai dan pahami kontrak instrumen.

## 7. Impor CSV

Buka **Daftar trade → Impor CSV** atau **Pengaturan → Impor CSV**. Unduh template terlebih dahulu.

Kolom wajib:

| Kolom | Contoh | Keterangan |
|---|---|---|
| symbol | BBCA | Simbol, maksimal 30 karakter |
| market | Saham | Saham, Crypto, Forex, Futures, Lainnya |
| direction | long | long atau short |
| openedAt | 2026-11-03T09:00 | ISO atau waktu lokal perangkat |
| entryPrice | 1000 | Titik desimal, tanpa pemisah ribuan |
| quantity | 100 | Lebih dari 0 |

Kolom opsional: `id`, `account`, `currency`, `closedAt`, `exitPrice`, `stopLoss`, `takeProfit`, `fees`, `multiplier`, `leverage`, `strategy`, `tags`, `emotion`, `setupNotes`, `exitNotes`, `lessons`, `rating`, `checklist`.

- Satu file untuk satu akun aktif. Nama akun/mata uang bila diisi harus cocok.
- Harga keluar dan tanggal keluar harus sama-sama terisi atau sama-sama kosong.
- Tag dipisahkan `|`. Checklist berupa JSON array `{id,text,checked}`.
- Strategi yang belum ada akan dibuat setelah konfirmasi impor.
- ID yang sudah ada di perangkat dilewati, termasuk saat berganti akun. Untuk menyalin trade ke akun lain, kosongkan ID atau gunakan ID baru.
- Seluruh file divalidasi sebelum impor. Satu baris salah membatalkan impor seluruh file.
- Maksimal 10 MB dan 10.000 baris per file.
- Ekspor CSV melindungi sel dari formula spreadsheet. CSV tidak menyertakan gambar; gunakan JSON untuk backup lengkap.

## 8. Backup, restore, dan pindah perangkat

**Pengaturan → Backup sekarang** membuat JSON lengkap dengan checksum. Di Android, pilih tujuan melalui menu berbagi/penyimpanan. Di web, file diunduh browser.

Untuk memulihkan: pilih file JSON → periksa jumlah trade/jurnal/gambar → **Ganti data perangkat** → ketik **GANTI**. Restore mengganti seluruh data, bukan menggabungkan. Draf belum disimpan akan hilang. Buat backup kondisi saat ini terlebih dahulu bila perlu.

Data browser, PWA pada browser lain, dan APK tidak otomatis tersinkronisasi. Pindahkan dengan JSON. Jangan menghapus data situs atau meng-uninstall sebelum backup tersimpan di tempat lain.

## 9. Offline dan instalasi PWA

- **APK:** langsung bekerja offline setelah dipasang.
- **Web/PWA:** buka sekali saat online, tunggu “Aset siap offline”/“Siap offline”, lalu pasang dari menu browser. Setelah service worker selesai menyimpan aset, aplikasi dapat dibuka ulang tanpa jaringan.
- iPhone: Safari → Bagikan → Tambahkan ke Layar Utama.
- Android Chrome: menu → Instal aplikasi/Tambahkan ke layar utama.
- Service worker memerlukan HTTPS atau localhost, dan tidak aktif pada `npm run dev` biasa.
- Pembaruan web diambil saat online; data tetap lokal. Tidak ada sinkronisasi cloud.

## 10. Jika ada masalah

- **Data tidak muncul:** periksa akun aktif dan filter periode/status. Data akun lain tidak dicampurkan.
- **Penyimpanan penuh:** backup, hapus lampiran besar atau kosongkan ruang perangkat. Jangan langsung menghapus data situs.
- **Gagal membuka IndexedDB:** pastikan browser tidak memblokir penyimpanan situs; coba browser normal, bukan mode privat.
- **Checksum tidak cocok:** file rusak/berubah atau bukan backup yang sesuai. Data perangkat tidak diubah. Gunakan salinan backup lain.
- **APK tidak bisa diperbarui:** pastikan paket dan signature sama. Jangan uninstall sebelum backup; APK debug dan produksi yang ditandatangani berbeda memakai identitas berbeda.
- **PWA tidak bisa offline:** buka versi produksi melalui HTTPS, tunggu aset siap, lalu coba reload. Cache browser dapat dibersihkan oleh pengguna atau sistem.
