# dmaz — Web PDF Translator (Netlify Ready)

Web app untuk menerjemahkan PDF menggunakan **metode scrape** ke endpoint
Google Translate gratis (`translate.googleapis.com/translate_a/single`).
Tidak perlu API key, langsung deploy ke **Netlify**.

## Arsitektur

```
+------------------+        teks         +-------------------------+
|  Browser (UI)    |  ----------------> |  Netlify Function        |
|  - pdf.js        |                    |  /api/translate          |
|  - extract PDF   |  <---------------- |  scrape Google Translate |
+------------------+    terjemahan      +-------------------------+
```

- **Ekstraksi teks PDF** dilakukan di sisi **browser** dengan `pdf.js` (CDN).
  Jadi PDF besar tetap aman dan tidak makan kuota Function.
- **Terjemahan** dijalankan oleh Netlify Function (Node 20). Function memecah
  teks per ~4500 karakter lalu memanggil endpoint `translate.googleapis.com`
  satu per satu.

## Fitur

- Drag & drop / pilih file PDF (sampai 50 MB)
- Pilih bahasa sumber (auto-detect) dan tujuan, daftar 130+ bahasa
- Side-by-side: teks asli vs terjemahan
- Salin ke clipboard / unduh `.txt`
- Progres bar per halaman
- Anti rate-limit: jeda 150 ms antar potongan, batas aman 80.000 karakter

## Struktur

```
.
├── netlify.toml                       # konfigurasi Netlify
├── netlify/
│   └── functions/
│       ├── translate.js               # POST /api/translate
│       └── health.js                  # GET  /api/health
├── public/                            # publish dir (statis)
│   ├── index.html
│   ├── style.css
│   └── app.js                         # frontend + pdf.js
├── server.js                          # server lokal (Express, dev only)
└── package.json
```

## Jalankan lokal

```bash
npm install
npm start
# buka http://localhost:3000
```

Atau pakai Netlify CLI biar persis seperti environment produksi:

```bash
npm i -g netlify-cli
netlify dev
# buka http://localhost:8888
```

## Deploy ke Netlify

### Opsi 1 — via Git (recommended)

1. Push repo ini ke GitHub.
2. Login ke [Netlify](https://app.netlify.com), klik **Add new site → Import an existing project**.
3. Pilih repo, biarkan setting default — `netlify.toml` sudah mengatur:
   - `publish = "public"`
   - `functions = "netlify/functions"`
4. Klik **Deploy site**. Selesai.

### Opsi 2 — via CLI

```bash
npm i -g netlify-cli
netlify login
netlify init       # ikuti prompt
netlify deploy --build --prod
```

## API

### `POST /api/translate`

Request:

```json
{
  "text": "Hello world",
  "source": "auto",
  "target": "id"
}
```

Response:

```json
{
  "success": true,
  "source": "auto",
  "target": "id",
  "chunks": 1,
  "truncated": false,
  "originalLength": 11,
  "result": "Halo dunia"
}
```

### `GET /api/health`

```json
{ "ok": true, "app": "dmaz", "runtime": "netlify-functions", "time": "..." }
```

## Catatan & batasan

- PDF hasil **scan / gambar** tidak menghasilkan teks. Perlu OCR terpisah
  (mis. Tesseract.js) — bukan cakupan project ini.
- Endpoint `translate.googleapis.com/translate_a/single` adalah endpoint
  publik tanpa API key. Bisa berubah / kena rate-limit sewaktu-waktu.
- Netlify Function free plan timeout 10 detik, pro 26 detik.
  Teks dibatasi 80.000 karakter untuk amannya — sisanya akan terpotong dan
  ditandai pada response (`truncated: true`).

## Lisensi

MIT
