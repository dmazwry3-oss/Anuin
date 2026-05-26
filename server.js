// dmaz - Web PDF Translator (metode scrape Google Translate)
// Backend: Express + pdf-parse + scrape endpoint translate.googleapis.com

const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Upload dipakai memori (tidak menulis ke disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Pecah teks panjang jadi potongan <= maxLen karakter,
 * dipotong di batas paragraf / kalimat agar terjemahan tetap natural.
 */
function chunkText(text, maxLen = 4500) {
  const chunks = [];
  let buf = '';
  const paragraphs = text.split(/\n+/);

  for (const p of paragraphs) {
    if ((buf + '\n' + p).length > maxLen) {
      if (buf) chunks.push(buf);
      if (p.length > maxLen) {
        // pecah lagi per kalimat
        const sentences = p.split(/(?<=[.!?])\s+/);
        let sBuf = '';
        for (const s of sentences) {
          if ((sBuf + ' ' + s).length > maxLen) {
            if (sBuf) chunks.push(sBuf);
            sBuf = s;
          } else {
            sBuf = sBuf ? sBuf + ' ' + s : s;
          }
        }
        if (sBuf) chunks.push(sBuf);
        buf = '';
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + '\n' + p : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Scrape endpoint Google Translate gratis (tidak butuh API key).
 * Mengembalikan teks hasil terjemahan.
 */
async function translateChunk(text, sourceLang, targetLang) {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=${encodeURIComponent(sourceLang)}` +
    `&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
    },
  });

  if (!res.ok) {
    throw new Error(`Google Translate respons ${res.status}`);
  }

  const data = await res.json();
  // Struktur respons: [[ ["translated","original",null,null,...], ... ], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Format respons tidak dikenali');
  }
  return data[0]
    .filter((seg) => Array.isArray(seg) && typeof seg[0] === 'string')
    .map((seg) => seg[0])
    .join('');
}

// ====================== Routes ======================

// 1) Upload PDF -> ekstrak teks saja
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File PDF tidak ada' });
    }
    const data = await pdfParse(req.file.buffer);
    res.json({
      success: true,
      pages: data.numpages,
      text: data.text,
      info: data.info || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2) Translate teks bebas (string)
app.post('/api/translate', async (req, res) => {
  try {
    const { text, source = 'auto', target = 'id' } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Field "text" wajib diisi' });
    }

    const chunks = chunkText(text);
    const translated = [];
    for (let i = 0; i < chunks.length; i++) {
      const out = await translateChunk(chunks[i], source, target);
      translated.push(out);
      // jeda kecil agar tidak rate-limit
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    res.json({
      success: true,
      source,
      target,
      chunks: chunks.length,
      result: translated.join('\n'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3) Endpoint gabungan: upload PDF + langsung translate
app.post('/api/pdf-translate', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File PDF tidak ada' });
    }
    const source = (req.body.source || 'auto').trim();
    const target = (req.body.target || 'id').trim();

    const parsed = await pdfParse(req.file.buffer);
    const original = parsed.text || '';

    if (!original.trim()) {
      return res.json({
        success: true,
        pages: parsed.numpages,
        original: '',
        translated: '',
        warning: 'PDF tidak memuat teks (kemungkinan hasil scan / berbentuk gambar).',
      });
    }

    const chunks = chunkText(original);
    const translated = [];
    for (let i = 0; i < chunks.length; i++) {
      const out = await translateChunk(chunks[i], source, target);
      translated.push(out);
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    res.json({
      success: true,
      pages: parsed.numpages,
      source,
      target,
      chunks: chunks.length,
      original,
      translated: translated.join('\n'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'dmaz', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`dmaz berjalan di http://localhost:${PORT}`);
});
