# dmaz — Web PDF Translator

Aplikasi web sederhana untuk menerjemahkan dokumen PDF menggunakan **metode scrape**
ke endpoint Google Translate gratis (`translate.googleapis.com`). Tidak butuh API key.

## Fitur
- Drag & drop / pilih file PDF (maks. 25 MB)
- Pilih bahasa sumber (auto-detect) dan tujuan
- Ekstraksi teks dengan `pdf-parse`
- Terjemahan otomatis dipotong per ~4500 karakter agar tidak kena limit
- Tampilan side-by-side: teks asli vs hasil terjemahan
- Salin ke clipboard / unduh `.txt`

## Jalankan lokal

```bash
npm install
npm start
```

Buka http://localhost:3000

## Struktur

```
.
├── server.js              # Express + pdf-parse + scrape Google Translate
├── package.json
└── public/
    ├── index.html         # UI
    ├── style.css
    └── app.js             # logic frontend
```

## Endpoint API

- `POST /api/extract` — multipart `pdf`, balas teks asli
- `POST /api/translate` — JSON `{ text, source, target }`
- `POST /api/pdf-translate` — multipart `pdf` + `source` + `target`, balas teks asli + terjemahan
- `GET  /api/health` — cek status

## Catatan
- PDF hasil scan (gambar) tidak menghasilkan teks — perlu OCR terpisah.
- Endpoint Google Translate yang digunakan adalah endpoint publik tanpa API key,
  bisa berubah/limit sewaktu-waktu.
