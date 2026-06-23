# Dokumentasi API - ProxyPool AI

Halaman ini mendokumentasikan semua rute API yang tersedia pada proyek ProxyPool AI. API ini memfasilitasi pengambilan proxy secara dinamis untuk diintegrasikan ke dalam bot/skrip otomatisasi eksternal, pengelolaan log, serta pembaruan konfigurasi sistem.

---

## 🚀 Rute API Utama

### 1. API Pengambil Proxy Pool (`/api/get`)
Rute ini digunakan secara programatis untuk mendapatkan daftar proxy aktif yang tersaring dari pool.

*   **Metode**: `GET`
*   **Query Parameter**:
    *   `protocol` (opsional): Memfilter proxy berdasarkan protokol (`http`, `https`, `socks4`, `socks5`).
    *   `country` (opsional): Memfilter berdasarkan kode negara ISO 2-digit (misalnya `US`, `HK`, `ID`, `NL`).
    *   `anonymity` (opsional): Memfilter berdasarkan tingkat anonimitas (`Elite`, `Anonymous`, `Transparent`).
    *   `max_latency` (opsional): Memfilter proxy dengan latensi maksimal dalam milidetik (misalnya `1500`).
    *   `limit` (opsional): Membatasi jumlah proxy yang dikembalikan (misalnya `10`).
    *   `format` (opsional, default: `json`): Mengubah format respons (`json`, `txt`, `csv`).

#### Contoh Request 1: Mengambil format JSON (Default)
```bash
curl "http://localhost:3000/api/get?protocol=socks5&country=HK&limit=1"
```
**Respons**:
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
    "source_url": "https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt"
  }
]
```

#### Contoh Request 2: Mengambil format TXT (Sederhana IP:Port)
Sangat cocok untuk langsung dibaca line-by-line oleh skrip Python, Node, atau Shell.
```bash
curl "http://localhost:3000/api/get?protocol=socks5&format=txt&limit=3"
```
**Respons**:
```text
47.79.79.35:10808
119.28.64.217:50161
125.24.156.113:7080
```

#### Contoh Request 3: Mengambil format CSV
```bash
curl "http://localhost:3000/api/get?format=csv&limit=2"
```
**Respons**:
```text
ip,port,protocol,country,anonymity,latency,isp,asn
47.79.79.35,10808,socks5,HK,Elite,345,Alibaba (US) Technology Co., Ltd.,AS45102 Alibaba (US) Technology Co., Ltd.
119.28.64.217,50161,socks5,HK,Elite,350,ComsenzNet,AS132203 Tencent Building, Kejizhongyi Avenue
```

---

### 2. API Ekspor Proxy (`/api/export`)
Rute ini digunakan oleh dasbor untuk mengunduh seluruh berkas proxy aktif yang tersimpan dalam format yang didukung.

*   **Metode**: `GET`
*   **Query Parameter**:
    *   `format` (opsional, default: `csv`): Format berkas ekspor (`csv`, `txt`, `json`, `clash`).

#### Format Clash YAML (`?format=clash`)
Menghasilkan struktur daftar proxy dalam format YAML yang kompatibel dengan aplikasi klien proxy populer seperti Clash, Clash Verge, atau Shadowrocket.
```bash
curl "http://localhost:3000/api/export?format=clash"
```
**Respons**:
```yaml
proxies:
  - { name: "Proxy-1-HK", type: socks5, server: 47.79.79.35, port: 10808 }
  - { name: "Proxy-2-HK", type: socks5, server: 119.28.64.217, port: 50161 }
  - { name: "Proxy-3-TH", type: socks5, server: 125.24.156.113, port: 7080 }
```

---

### 3. API Konfigurasi Sistem (`/api/config`)
Rute ini digunakan oleh panel pengaturan untuk mengambil konfigurasi saat ini atau melakukan pembaruan di database.

#### Mengambil Konfigurasi saat ini
*   **Metode**: `GET`
*   **Respons**:
```json
{
  "id": 1,
  "current_step": "Idle",
  "scanned_urls": 30,
  "proxies_found": 5159,
  "verified_live": 211,
  "is_running": 0,
  "should_stop": 0,
  "check_timeout": 3000,
  "check_concurrency": 200,
  "test_target_url": "http://ip-api.com/json",
  "ai_api_key": "sk-68b631cc...",
  "ai_endpoint": "https://9router.indrayuda.my.id/v1/chat/completions",
  "ai_enabled": 0,
  "updated_at": "2026-06-23 15:11:06"
}
```

#### Memperbarui Konfigurasi
*   **Metode**: `POST`
*   **Payload (JSON)**:
```json
{
  "check_timeout": 5000,
  "check_concurrency": 150,
  "test_target_url": "https://httpbin.org/ip",
  "ai_enabled": false
}
```
*   **Respons**:
```json
{
  "success": true,
  "updated": {
    "check_timeout": 5000,
    "check_concurrency": 150,
    "test_target_url": "https://httpbin.org/ip",
    "ai_enabled": 0
  }
}
```

---

### 4. API Log Aktivitas (`/api/logs`)
Rute ini memelihara log eksekusi scraper dan checker yang dapat ditayangkan secara real-time di UI konsol.

#### Mengambil Log Aktivitas Terbaru
*   **Metode**: `GET`
*   **Query Parameter**:
    *   `limit` (opsional, default: `100`): Jumlah log terbaru yang ingin dibaca.
*   **Respons**:
```json
[
  {
    "id": 64,
    "message": "Check Configuration: Timeout=3000ms, Concurrency=200, Target=http://ip-api.com/json",
    "level": "info",
    "timestamp": "2026-06-23 15:10:51"
  },
  {
    "id": 63,
    "message": "Starting verification of 5159 unique proxies...",
    "level": "info",
    "timestamp": "2026-06-23 15:10:51"
  }
]
```

#### Mengosongkan Log Aktivitas
*   **Metode**: `DELETE`
*   **Respons**:
```json
{
  "success": true
}
```
