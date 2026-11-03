# Android: build, pemasangan, dan distribusi

## Paket yang dihasilkan

Workflow referensi `docs/ci/android.yml` (aktifkan sebagai `.github/workflows/android.yml`) menguji web terlebih dahulu, membundel hasil build yang sama ke Capacitor, lalu membuat:

- `TradingAgents-Journal-Android.apk`
- `SHA256SUMS.txt`

File tersedia sebagai artifact workflow dan aset GitHub Release. Release diberi label prerelease karena menggunakan **kunci debug publik**, bukan kunci produksi.

Application ID uji coba: `com.ari2407.tradingagentsjournal.debug`.

## Pasang di Android

1. Unduh APK dari Releases melalui browser Android.
2. Izinkan instalasi dari browser/file manager yang digunakan bila Android meminta.
3. Selesaikan pemasangan dan buka aplikasi.
4. Setelah memasang, internet tidak diperlukan untuk fitur jurnal.
5. Backup melalui Pengaturan; pilih aplikasi penyimpanan/cloud melalui menu berbagi Android. Aplikasi tidak mengunggah data sendiri.

Minimum API 23. Gunakan Android System WebView/Chrome modern yang masih menerima pembaruan. Jika perangkat sangat lama tidak dapat menjalankan WebView modern, gunakan browser/PWA yang didukung atau perangkat lebih baru.

## Build lokal

Prasyarat:

- Node.js 22.12+
- JDK 21
- Android Studio dan Android SDK Platform 35
- Build-tools 35.0.0
- `ANDROID_HOME`/`ANDROID_SDK_ROOT` mengarah ke SDK, atau `android/local.properties` berisi `sdk.dir`

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`.

`npm run android:debug` menjalankan build dan Gradle. `npm run android:open` membuka Android Studio. Emulator/device diperlukan untuk uji runtime native; pengujian Playwright menguji aplikasi web dan offline, bukan menggantikan uji perangkat Android.

Jangan mengedit `android/app/src/main/assets/public` secara manual. Folder itu dihasilkan `cap sync` dari `dist`.

## Signing pengembangan

`android-signing/debug.keystore` sengaja dipublikasikan agar semua build CI dapat diperbarui tanpa perubahan signature. Password `android` bukan rahasia. Alias `androiddebugkey`, format PKCS12.

Kunci ini hanya untuk build debug. Jangan menggunakannya untuk Play Store atau menyimpan rahasia aplikasi di dalamnya. Build debug memakai suffix `.debug`, sehingga tidak berpura-pura menjadi paket produksi.

## Rilis produksi berikutnya

1. Buat keystore produksi pribadi dengan Android Studio **Generate Signed Bundle / APK**.
2. Simpan keystore/password di luar Git, misalnya GitHub Secrets atau credential store organisasi.
3. Konfigurasikan signing release di Android Studio atau Gradle menggunakan environment/secret tersebut.
4. Gunakan applicationId produksi tanpa suffix `.debug`.
5. Naikkan `versionCode`, target SDK sesuai persyaratan distribusi saat itu, dan uji pada perangkat fisik.
6. Build AAB untuk Play Store atau APK produksi yang ditandatangani untuk distribusi langsung.
7. Siapkan kebijakan privasi, ikon/store listing, pengujian internal, dan proses pemulihan kunci.

APK debug tidak dapat diperbarui menjadi APK produksi dengan signature berbeda. Backup JSON diperlukan sebelum berpindah paket. Jangan meng-uninstall aplikasi lama sebelum backup diverifikasi.

## Resource dan izin

Ikon/splash dihasilkan dari `public/icon.svg` oleh `scripts/generate-android-assets.mjs`. Manifest menonaktifkan Android cloud backup dan cleartext traffic. File backup ditulis ke cache aplikasi lalu dibagikan melalui FileProvider; tidak memerlukan izin penyimpanan luas.

INTERNET tetap ada untuk kompatibilitas WebView Capacitor, tetapi aplikasi tidak melakukan panggilan API eksternal dalam alur jurnal. Tautan GitHub hanya dibuka jika pengguna memilih melihat unduhan/kode sumber.

## Checklist uji perangkat fisik

- [ ] Instal APK baru dan buka tanpa Wi-Fi/data.
- [ ] Catat trade, tutup posisi, cek P&L dan kalender.
- [ ] Tambah screenshot dari picker, buka kembali setelah restart.
- [ ] Tulis jurnal harian/mingguan, restart aplikasi.
- [ ] Buat backup JSON, simpan ke lokasi di luar aplikasi.
- [ ] Pulihkan backup di perangkat/profil lain dan cocokkan jumlah data.
- [ ] Uji tombol Back Android pada dialog dan halaman.
- [ ] Uji tema gelap, ukuran font sistem, dan layar kecil.
- [ ] Instal build CI berikutnya sebagai pembaruan; pastikan data tetap ada.
