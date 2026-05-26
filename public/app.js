// Anuin - Scribd Downloader frontend logic
(() => {
  const $ = (id) => document.getElementById(id);

  const form = $('form');
  const urlInput = $('url');
  const submitBtn = $('submitBtn');
  const spinner = submitBtn.querySelector('.spinner');
  const submitLabel = submitBtn.querySelector('.label');
  const alertBox = $('alert');
  const resultSection = $('resultSection');
  const resultTitle = $('resultTitle');
  const resultCanonical = $('resultCanonical');
  const kindBadge = $('kindBadge');
  const docIdBadge = $('docIdBadge');
  const mirrorsEl = $('mirrors');

  // Show alert
  function showAlert(msg, type = 'error') {
    alertBox.hidden = false;
    alertBox.className = `alert ${type}`;
    alertBox.textContent = msg;
  }
  function clearAlert() {
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.hidden = !loading;
    submitLabel.textContent = loading ? 'Memproses...' : 'Get Download Now';
  }

  // Quick client-side sanity check, server still has the authoritative parser.
  const VALID_RE =
    /^https?:\/\/([a-z]{2,3}\.)?(www\.|m\.)?scribd\.com\/(document|doc|presentation)\/\d+(?:\/[^?#]*)?/i;

  async function lookup(rawUrl) {
    const url = rawUrl.trim();
    if (!url) {
      showAlert('Tempel dulu URL Scribd-nya, ya.');
      return;
    }
    if (!VALID_RE.test(url) && !VALID_RE.test('https://' + url)) {
      showAlert(
        'URL belum valid. Format yang didukung: scribd.com/document/<id>/<slug>, /doc/<id>/<slug>, atau /presentation/<id>/<slug>.'
      );
      return;
    }

    clearAlert();
    setLoading(true);
    resultSection.hidden = true;

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      renderResult(data);
    } catch (err) {
      console.error(err);
      showAlert('Gagal memproses: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderResult(data) {
    resultSection.hidden = false;
    resultTitle.textContent = data.title || `Dokumen #${data.docId}`;
    resultCanonical.textContent = data.normalizedUrl;
    resultCanonical.href = data.normalizedUrl;
    kindBadge.textContent = data.kind;
    docIdBadge.textContent = `ID: ${data.docId}`;

    mirrorsEl.innerHTML = '';
    (data.mirrors || []).forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'mirror' + (m.recommended ? ' recommended' : '');
      card.innerHTML = `
        <div class="mirror-rank">${i + 1}</div>
        <div class="mirror-body">
          <div class="mirror-title-row">
            <h4>${escapeHtml(m.name)}</h4>
            ${m.recommended ? '<span class="pill">Recommended</span>' : ''}
          </div>
          <p class="muted small">${escapeHtml(m.description || '')}</p>
          <code class="mirror-url">${escapeHtml(m.url)}</code>
        </div>
        <div class="mirror-actions">
          <button class="btn ghost sm" data-copy="${escapeAttr(m.url)}">Salin</button>
          <a class="btn primary sm" href="${escapeAttr(m.url)}" target="_blank" rel="noopener noreferrer">
            Buka ↗
          </a>
        </div>
      `;
      mirrorsEl.appendChild(card);
    });

    // Smooth scroll into view
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Tiny HTML helpers (avoid XSS from titles fetched server-side)
  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    lookup(urlInput.value);
  });

  // Example chips
  document.querySelectorAll('[data-example]').forEach((el) => {
    el.addEventListener('click', () => {
      urlInput.value = el.dataset.example;
      urlInput.focus();
      lookup(urlInput.value);
    });
  });

  // Copy buttons (event delegation)
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-copy]');
    if (!target) return;
    const text = target.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(text);
      const original = target.textContent;
      target.textContent = 'Tersalin!';
      target.classList.add('ok');
      setTimeout(() => {
        target.textContent = original;
        target.classList.remove('ok');
      }, 1400);
    } catch {
      showAlert('Gagal menyalin ke clipboard.');
    }
  });

  // Auto-detect URL pasted in address bar style: ?url=...
  const params = new URLSearchParams(location.search);
  if (params.get('url')) {
    urlInput.value = params.get('url');
    lookup(urlInput.value);
  }

  // Footer year
  $('year').textContent = new Date().getFullYear();
})();
