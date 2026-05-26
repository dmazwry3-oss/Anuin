// Netlify Function: terjemahkan teks via scrape endpoint Google Translate.
// Method: POST  Body JSON: { text, source = 'auto', target = 'id' }

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
        const sentences = p.split(/(?<=[.!?])\s+/);
        let sBuf = '';
        for (const s of sentences) {
          if ((sBuf + ' ' + s).length > maxLen) {
            if (sBuf) chunks.push(sBuf);
            // kalimat super panjang -> potong paksa
            if (s.length > maxLen) {
              for (let i = 0; i < s.length; i += maxLen) {
                chunks.push(s.slice(i, i + maxLen));
              }
              sBuf = '';
            } else {
              sBuf = s;
            }
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
      Accept: 'application/json, text/plain, */*',
    },
  });

  if (!res.ok) {
    throw new Error(`Google Translate respons ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Format respons tidak dikenali');
  }
  return data[0]
    .filter((seg) => Array.isArray(seg) && typeof seg[0] === 'string')
    .map((seg) => seg[0])
    .join('');
}

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { success: false, error: 'Body harus JSON valid' });
  }

  const { text, source = 'auto', target = 'id' } = payload;
  if (!text || typeof text !== 'string') {
    return json(400, { success: false, error: 'Field "text" wajib diisi' });
  }

  // Hard limit isi teks supaya tidak meledak waktu di Netlify (max 26s di pro).
  // ~80k char biasanya selesai di bawah 25 detik.
  const MAX_CHARS = 80_000;
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  try {
    const chunks = chunkText(trimmed);
    const translated = [];
    for (let i = 0; i < chunks.length; i++) {
      const out = await translateChunk(chunks[i], source, target);
      translated.push(out);
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    return json(200, {
      success: true,
      source,
      target,
      chunks: chunks.length,
      truncated: text.length > MAX_CHARS,
      originalLength: text.length,
      result: translated.join('\n'),
    });
  } catch (err) {
    return json(500, { success: false, error: err.message });
  }
};
