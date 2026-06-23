# ProxyPool AI Premium 🛡️⚡

<p align="center">
  <img src="./public/logo.png" alt="ProxyPool AI Logo" width="220" height="220" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License MIT" />
</p>

**ProxyPool AI Premium** adalah sistem manajemen proxy pool otomatis tingkat profesional yang dirancang untuk mengikis (scraping), memvalidasi (checking), dan menyajikan proxy publik berkualitas tinggi secara dinamis. Proyek ini dilengkapi dengan antarmuka dasbor web Next.js modern (Glassmorphism), logger real-time berbasis database, serta API endpoint pengambil proxy yang ramah developer.

---

## ✨ Fitur Unggulan

*   **🔍 AI-Powered Scraping & Fallback Regex**: Menghasilkan kueri pencarian secara dinamis menggunakan model AI (Gemma) dan melakukan ekstraksi pintar berbasis LLM untuk halaman HTML. Jika dinonaktifkan/gagal, sistem otomatis beralih ke Regex cepat untuk file teks mentah.
*   **⚡ Multi-Threaded Checker (200 Threads)**: Memvalidasi keaktifan proxy secara asinkron dengan batas konkurensi dinamis, menguji latensi real-time, mendeteksi negara, serta merekam informasi **ISP** (Internet Service Provider) dan **ASN**.
*   **🎯 Custom Test Targets**: Mendukung pengujian proxy terhadap target URL kustom (seperti Cloudflare, Google, Netflix, dll.) langsung dari konfigurasi dasbor.
*   **💻 Dasbor Web Premium (SaaS Layout)**: Tampilan Glassmorphism modern dengan grafik interaktif `recharts` untuk sebaran protokol, latensi, dan wilayah geografis. Dilengkapi konsol Log Aktivitas Real-time dan panel pengaturan sistem.
*   **🛠️ Optimasi SQLite Busy Lock**: Memproses verifikasi dan penyimpanan secara bertahap (incremental chunking per 15 sumber) dan memfilter proses `DELETE` dengan `Set` memori untuk meningkatkan performa tulis database hingga **100x lipat**.
*   **🔌 API Pool & Ekspor Multi-Format**: Endpoint `/api/get` siap-pakai bagi bot/skrip otomatisasi Anda untuk menarik proxy aktif dengan berbagai filter, mendukung format **JSON**, **TXT (IP:Port)**, dan **Clash YAML**.

---

## 🚀 Panduan Memulai

### Prasyarat
Pastikan Anda telah menginstal [Node.js](https://nodejs.org/) (versi 18+ direkomendasikan) pada sistem Anda.

### 1. Kloning Proyek
```bash
git clone https://github.com/IndraYuda13/proxyScraper.git
cd proxyScraper
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Dasbor (Next.js)
Jalankan server pengembangan lokal:
```bash
npm run dev
```
Buka browser Anda dan akses **[http://localhost:3000](http://localhost:3000)** untuk membuka dasbor administrasi.

### 4. Menjalankan Runner Logika Scraping
Anda dapat memicu siklus pencarian proxy dengan dua cara:
1.  **Melalui UI**: Klik tombol **Force Scrape** pada dasbor web.
2.  **Melalui CLI (Background Script)**: Jalankan skrip runner mandiri:
    ```bash
    npx tsx runner.ts
    ```

---

## 🔌 API Reference (Proxy Pool)

Dapatkan daftar proxy aktif secara programatis untuk diintegrasikan ke bot atau skrip scraping eksternal Anda.

### 1. Ambil Proxy (JSON)
*   **Endpoint**: `GET /api/get`
*   **Query Params**:
    *   `protocol` (opsional): `http`, `https`, `socks4`, `socks5`
    *   `country` (opsional): kode negara dua digit (misal `US`, `HK`, `ID`)
    *   `anonymity` (opsional): `Elite`, `Anonymous`, `Transparent`
    *   `max_latency` (opsional): batas latensi milidetik (misal `1000`)
    *   `limit` (opsional): batas jumlah hasil (misal `50`)

**Contoh Request**:
`GET http://localhost:3000/api/get?protocol=socks5&limit=1`

**Contoh Response**:
```json
[
  {
    "id": 1,
    "ip": "47.79.79.35",
    "port": "10808",
    "protocol": "socks5",
    "country": "HK",
    "anonymity": "Elite",
    "latency": 345,
    "status": "active",
    "isp": "Alibaba (US) Technology Co., Ltd.",
    "asn": "AS45102 Alibaba (US) Technology Co., Ltd.",
    "last_checked": "2026-06-23 15:10:51",
    "source_url": "https://raw.githubusercontent.com/..."
  }
]
```

### 2. Ambil Proxy Format Teks Mentah (TXT)
Sangat berguna untuk perkakas otomatisasi yang memerlukan format daftar `IP:Port`.
*   **Endpoint**: `GET /api/get?format=txt`

**Contoh Output**:
```text
47.79.79.35:10808
119.28.64.217:50161
```

---

## 📂 Struktur Dokumentasi Lanjutan

Untuk informasi teknis lebih mendalam, silakan baca dokumentasi berikut:
*   📘 **[API Reference Lengkap](file:///docs/API.md)**: Detail seluruh rute API (`/api/get`, `/api/export`, `/api/config`, `/api/logs`).
*   🧱 **[Panduan Arsitektur Proyek](file:///docs/ARCHITECTURE.md)**: Skema aliran data system scraper-checker, relasi SQLite, dan antarmuka Next.js.
*   📈 **[Changelog Rilis](file:///CHANGELOG.md)**: Log rilis pembaruan fitur proyek dari waktu ke waktu.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Baca berkas [LICENSE](file:///LICENSE) untuk informasi lebih lanjut.
