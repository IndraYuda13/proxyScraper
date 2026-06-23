# Changelog - ProxyPool AI Premium

Semua perubahan penting pada proyek ini akan didokumentasikan di berkas ini.

---

## [1.0.0] - 2026-06-23
Ini adalah rilis premium perdana dari **ProxyPool AI Premium** setelah dilakukan pembaruan arsitektural dan antarmuka secara besar-besaran.

### ✨ Fitur Baru
*   **Dasbor Web Glassmorphism Premium**: Desain ulang total halaman administrasi dengan visualisasi modern, navigasi tab, pencarian cepat, filter lanjutan, dan tombol salin instan.
*   **Grafik Analitik Interaktif**: Mengintegrasikan `recharts` untuk menampilkan diagram protokol proxy, distribusi latensi respons, dan ranking asal negara proxy.
*   **Konsol Log Real-time**: Logging aktivitas scraper dan checker secara langsung ke tabel database SQLite dan di-render live di tab Logs UI.
*   **Pengecekan Bertahap (Incremental Check)**: Hasil penelusuran proxy diverifikasi dan dimasukkan ke database per chunk (15 sumber) sehingga data muncul instan di dasbor tanpa menunggu seluruh proses selesai.
*   **Proxy Pool API Endpoint (`/api/get`)**: Endpoint API publik siap-pakai untuk integrasi eksternal dengan dukungan format JSON, TXT (IP:Port), dan CSV.
*   **Ekspor Konfigurasi Clash (`/api/export?format=clash`)**: Opsi ekspor daftar proxy ke format Clash/Shadowrocket YAML.
*   **Pengaturan Sistem Dinamis**: Konfigurasi Timeout, Concurrency, Target URL Tes, dan Kunci API AI langsung dari panel pengaturan UI.
*   **Informasi Jaringan ISP & ASN**: Deteksi otomatis nama operator internet (ISP) dan kode ASN untuk setiap IP proxy aktif.

### ⚡ Optimasi & Perbaikan Kestabilan
*   **Optimasi SQLite Tulis**: Menghapus operasi database `DELETE` yang berlebihan untuk proxy mati baru, meningkatkan kecepatan checking hingga 100x lipat dan melenyapkan error `database is locked`.
*   **Pencegahan Eksekusi Konkuren**: Memasang pemeriksaan status asinkron untuk mencegah jalannya dua siklus scraper bersamaan.
*   **Penanganan Uncaught Exception**: Menambahkan penangkap event error global soket/TLS agar server tidak crash di lingkungan produksi karena kegagalan jembatan proxy.
