// Anuin - Scribd Downloader serverless function
// Runs on Netlify Functions (Node 18+, native fetch).
//
// Accepts: POST { url: "<scribd url>" }   OR   GET ?url=<scribd url>
// Returns:
//   {
//     success: true,
//     input:        "<original input>",
//     normalizedUrl:"<scribd canonical url>",
//     docId:        "<id>",
//     slug:         "<slug or null>",
//     kind:         "document" | "doc" | "presentation",
//     title:        "<extracted title or null>",
//     mirrors: [
//       { name, url, recommended: true|false, description }
//     ]
//   }

const SCRIBD_HOSTS = new Set([
  'scribd.com',
  'www.scribd.com',
  'm.scribd.com',
  'id.scribd.com',
  'es.scribd.com',
  'fr.scribd.com',
]);

const VALID_KINDS = ['document', 'doc', 'presentation'];

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Cache-Control': 'no-cache',
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=120',
    },
    body: JSON.stringify(payload),
  };
}

/**
 * Parse a Scribd URL and return its components.
 * Supports:
 *   https://www.scribd.com/document/123456789/My-Title
 *   https://www.scribd.com/doc/36341/Business-Plan-Template
 *   https://www.scribd.com/presentation/12345/Slides
 *   https://scribd.com/document/123/Title  (no www)
 *   https://id.scribd.com/document/123/Title (locale subdomain)
 */
function parseScribdUrl(raw) {
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }

  if (!SCRIBD_HOSTS.has(u.hostname.toLowerCase())) return null;

  const parts = u.pathname.split('/').filter(Boolean); // remove empties
  if (parts.length < 2) return null;

  const kind = parts[0].toLowerCase();
  if (!VALID_KINDS.includes(kind)) return null;

  const docId = parts[1];
  if (!/^\d+$/.test(docId)) return null;

  const slug = parts[2] || null;

  return {
    kind,
    docId,
    slug,
    canonical: `https://www.scribd.com/${kind}/${docId}${slug ? '/' + slug : ''}`,
  };
}

/**
 * Try to fetch the vdownloaders.com page and extract a direct download URL,
 * if present in the HTML. Best-effort; if we can't parse it, we still return
 * the page link as a guaranteed working mirror.
 */
async function probeVDownloaders(parsed) {
  const target = `https://scribd.vdownloaders.com/${parsed.kind}/${parsed.docId}${
    parsed.slug ? '/' + parsed.slug : ''
  }`;
  try {
    const res = await fetch(target, {
      headers: COMMON_HEADERS,
      redirect: 'follow',
      // Function timeout in Netlify is ~10s for synchronous, so cap it.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { url: target, directLink: null, title: null };
    const html = await res.text();

    // Try to find a download link / iframe pointing to ilide or s3 bucket
    const candidates = [
      /https?:\/\/ilide\.info\/[^\s"'<>]+/i,
      /https?:\/\/[^"'<>\s]+\.(?:pdf|epub|docx?)\b[^"'<>\s]*/i,
      /https?:\/\/[^"'<>\s]+\/download[^"'<>\s]*/i,
    ];
    let directLink = null;
    for (const re of candidates) {
      const m = html.match(re);
      if (m) {
        directLink = m[0].replace(/&amp;/g, '&');
        break;
      }
    }

    // Title (best effort)
    const titleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    return { url: target, directLink, title };
  } catch (err) {
    return { url: target, directLink: null, title: null, error: err.message };
  }
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  // Read input
  let input = '';
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      input = (body.url || '').toString();
    } catch {
      return json(400, { success: false, error: 'Body JSON tidak valid' });
    }
  } else {
    input = (event.queryStringParameters && event.queryStringParameters.url) || '';
  }

  input = input.trim();
  if (!input) {
    return json(400, {
      success: false,
      error: 'Parameter "url" wajib diisi (URL Scribd)',
    });
  }

  // Auto-prepend https:// if user pasted "scribd.com/..."
  if (!/^https?:\/\//i.test(input)) {
    input = 'https://' + input;
  }

  const parsed = parseScribdUrl(input);
  if (!parsed) {
    return json(400, {
      success: false,
      error:
        'URL tidak valid. Format yang didukung: ' +
        'https://www.scribd.com/document/<id>/<slug>, ' +
        '/doc/<id>/<slug>, atau /presentation/<id>/<slug>',
    });
  }

  // Probe the main mirror (vdownloaders) in the background
  const probe = await probeVDownloaders(parsed);

  // Build a list of mirrors. Order = recommended first.
  const mirrors = [
    {
      name: 'VDownloaders',
      url: probe.url,
      recommended: true,
      description:
        'Mirror utama. Buka link, klik "Get Download Now", lalu unduh PDF/DOC.',
    },
    {
      name: 'iLIDE Viewer',
      url: `https://ilide.info/docview/viewer/index.html?slug=${encodeURIComponent(
        parsed.slug || parsed.docId
      )}`,
      recommended: false,
      description: 'Viewer alternatif berbasis PDF.js (bisa baca tanpa login).',
    },
    {
      name: 'DocDownloader',
      url: `https://docdownloader.com/${parsed.kind === 'doc' ? 'document' : parsed.kind}/${
        parsed.docId
      }`,
      recommended: false,
      description: 'Mirror cadangan jika VDownloaders sedang down.',
    },
    {
      name: 'Scribd asli',
      url: parsed.canonical,
      recommended: false,
      description: 'Buka halaman aslinya di scribd.com (butuh akun untuk download).',
    },
  ];

  // If we managed to extract a direct file link, surface it at the top.
  if (probe.directLink) {
    mirrors.unshift({
      name: 'Direct Download',
      url: probe.directLink,
      recommended: true,
      description: 'Link unduhan langsung yang berhasil diekstrak server-side.',
    });
  }

  return json(200, {
    success: true,
    input,
    normalizedUrl: parsed.canonical,
    docId: parsed.docId,
    slug: parsed.slug,
    kind: parsed.kind,
    title: probe.title,
    directLink: probe.directLink,
    mirrors,
  });
};
