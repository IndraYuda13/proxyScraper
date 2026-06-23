# Panduan Kontribusi (Contributing Guide)

Terima kasih telah tertarik untuk berkontribusi pada **ProxyPool AI Premium**! Kami menyambut baik kontribusi dari komunitas, baik berupa perbaikan bug, penambahan fitur baru, dokumentasi, maupun masukan lainnya.

---

## 🚀 Alur Kerja Kontribusi

1.  **Fork Repositori**: Lakukan fork pada repositori ini ke akun GitHub Anda.
2.  **Kloning Repositori**: Kloning hasil fork tersebut ke mesin lokal Anda:
    ```bash
    git clone https://github.com/USERNAME/proxyScraper.git
    cd proxyScraper
    ```
3.  **Buat Branch Baru**: Buat branch baru untuk pengerjaan fitur atau perbaikan Anda:
    ```bash
    git checkout -b feat/nama-fitur-anda
    # atau untuk bugfix
    git checkout -b fix/nama-bug-anda
    ```
4.  **Lakukan Perubahan**: Implementasikan perubahan kode Anda dengan rapi.
5.  **Uji Coba**: Pastikan aplikasi berjalan normal dan build Next.js sukses tanpa error:
    ```bash
    npm run build
    ```
6.  **Commit Perubahan**: Gunakan format pesan commit yang jelas (kami merekomendasikan standard [Conventional Commits](https://www.conventionalcommits.org/)):
    ```bash
    git commit -m "feat: deskripsi singkat fitur baru"
    ```
7.  **Push Branch**: Push branch Anda ke repositori fork:
    ```bash
    git push origin feat/nama-fitur-anda
    ```
8.  **Ajukan Pull Request**: Buka repositori asli dan ajukan Pull Request (PR) dari branch fork Anda. Gunakan templat PR yang telah kami sediakan untuk mendokumentasikan perubahan Anda.

---

## 🛠️ Aturan Coding & Standar Proyek

*   **TypeScript**: Proyek ini menggunakan TypeScript secara penuh. Pastikan tidak ada tipe data `any` yang tidak perlu, dan gunakan tipe data yang tepat.
*   **Gaya Kode (Style Guide)**: Ikuti standar penulisan kode yang sudah terkonfigurasi pada ESLint. Jalankan linting sebelum mengajukan PR:
    ```bash
    npm run lint
    ```
*   **Keamanan Proxy**: Jangan pernah menyertakan API Key, kredensial database pribadi, atau data sensitif lainnya ke dalam repositori. Konfigurasi sensitif harus dibaca dari database lokal (`proxies.db` yang tidak di-track) atau via interface UI.

---

## 💬 Melaporkan Masalah & Diskusi

*   Jika Anda menemukan bug, silakan buat Issue baru menggunakan templat **Bug Report** yang tersedia.
*   Untuk usulan fitur baru, gunakan templat **Feature Request**.
*   Pastikan untuk mencari terlebih dahulu di daftar Issue yang ada sebelum membuat Issue baru untuk menghindari duplikasi.

Kami sangat menghargai waktu dan kontribusi Anda untuk membuat ProxyPool AI Premium menjadi lebih baik! 🌟
