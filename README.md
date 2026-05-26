# Anuin · Scribd Downloader

Web app gratis untuk mengunduh dokumen Scribd. Tempel URL Scribd, sistem
mengembalikan beberapa mirror unduhan (PDF / DOC / PPT). Dirancang untuk
**deploy 1-klik ke Netlify** menggunakan **Netlify Functions** sebagai proxy
server-side (anti-CORS, tidak butuh API key).

> Dokumen tetap milik kreatornya. Pakai dengan tanggung jawab pribadi.

---

## Fitur

- Input URL Scribd (`/document/`, `/doc/`, `/presentation/`)
- Validasi URL di sisi client + server
- Netlify Function memprobing mirror utama (`scribd.vdownloaders.com`) dan
  mengekstrak link unduh langsung jika tersedia
- Mengembalikan daftar mirror berurutan, lengkap dengan tombol salin & buka
- UI dark mode responsif (mobile friendly)
- Deep-link `?url=...` (tempel URL di address bar Anuin langsung jalan)
- Tanpa dependency npm — hanya pakai `fetch` bawaan Node 18+

---

## Struktur

```
.
├── netlify.toml                 # Konfigurasi build & redirects Netlify
├── package.json
├── netlify/
│   └── functions/
│       └── scrape.js            # Serverless proxy /api/scrape
└── public/                      # Static site (publish dir)
    ├── index.html
    ├── app.js
    └── style.css
```

---

## Deploy ke Netlify

### Cara A — via Git (paling gampang)

1. Push repo ini ke GitHub / GitLab / Bitbucket.
2. Login ke <https://app.netlify.com> → **Add new site → Import an existing project**.
3. Pilih repo Anuin.
4. Build settings biasanya terdeteksi otomatis dari `netlify.toml`. Kalau diminta isi manual:
   - **Build command:** kosongkan (atau `echo done`)
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Klik **Deploy site**. Selesai.

### Cara B — via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init        # ikuti prompt, pilih repo / create new site
netlify deploy      # preview deploy
netlify deploy --prod
```

### Cara C — manual zip drop

1. Zip seluruh folder project (termasuk `netlify.toml`, `netlify/`, dan `public/`).
2. Buka <https://app.netlify.com/drop> dan tarik ZIP-nya.

---

## Jalankan lokal

Butuh **Node 18+** dan Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

Buka <http://localhost:8888>. Function tersedia di `/api/scrape`.

---

## API

### `POST /api/scrape`

Body JSON:

```json
{ "url": "https://www.scribd.com/document/123456789/Judul" }
```

Atau pakai GET: `/api/scrape?url=https://www.scribd.com/...`

Contoh respons sukses:

```json
{
  "success": true,
  "input": "https://www.scribd.com/document/36341/Business-Plan-Template",
  "normalizedUrl": "https://www.scribd.com/document/36341/Business-Plan-Template",
  "docId": "36341",
  "slug": "Business-Plan-Template",
  "kind": "document",
  "title": "Business Plan Template",
  "directLink": null,
  "mirrors": [
    {
      "name": "VDownloaders",
      "url": "https://scribd.vdownloaders.com/document/36341/Business-Plan-Template",
      "recommended": true,
      "description": "Mirror utama..."
    },
    { "name": "iLIDE Viewer",   "url": "...", "recommended": false },
    { "name": "DocDownloader",  "url": "...", "recommended": false },
    { "name": "Scribd asli",    "url": "...", "recommended": false }
  ]
}
```

Contoh respons error:

```json
{
  "success": false,
  "error": "URL tidak valid. Format yang didukung: https://www.scribd.com/document/<id>/<slug>, ..."
}
```

---

## Cara kerja singkat

1. User mengisi URL Scribd di frontend.
2. Frontend POST ke `/api/scrape` (Netlify Function).
3. Function:
   - Validasi & normalisasi URL,
   - Susun URL mirror utama `scribd.vdownloaders.com/<kind>/<id>/<slug>`,
   - `fetch` halaman mirror server-side dengan timeout 8 detik,
   - Coba ekstrak: judul (`og:title` / `<title>`) & link unduh langsung
     (regex `*.pdf`, `ilide.info/...`, `*/download*`),
   - Bangun daftar mirror (VDownloaders, iLIDE, DocDownloader, Scribd asli).
4. Frontend menampilkan daftar mirror dengan tombol **Salin** & **Buka ↗**.

---

## Catatan

- Mirror publik bisa rate-limit / down sewaktu-waktu. Itulah alasan ada beberapa
  fallback. Kalau semuanya bermasalah, biasanya cukup tunggu beberapa menit.
- Anuin **tidak menyimpan** URL atau hasil unduhan kamu di server.
- Jangan deploy versi yang dimodifikasi untuk melanggar TOS Scribd.

---

## Lisensi

MIT
