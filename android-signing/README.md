# Kunci Android khusus pengembangan

`debug.keystore` adalah kunci uji coba yang **sengaja dipublikasikan** agar APK debug dari CI dapat dipasang sebagai pembaruan tanpa ganti signature.

- Format: PKCS12
- Alias: `androiddebugkey`
- Password toko/key: `android` (bukan rahasia)
- Hanya untuk build `debug`, applicationId: `com.ari2407.tradingagentsjournal.debug`
- Jangan gunakan untuk rilis produksi/Play Store.
- Jangan menyimpan data sensitif yang belum di-backup jika akanmeng-uninstall APK.

Rilis produksi harus memakai kunci privat tersendiri yang disimpan di GitHub Secrets atau Android Studio, bukan file ini. Lihat `docs/ANDROID.md`.
