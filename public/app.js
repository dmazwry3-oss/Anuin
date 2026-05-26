// dmaz - frontend logic
(() => {
  const LANGS = [
    { code: 'auto', name: 'Deteksi otomatis', src: true },
    { code: 'id', name: 'Indonesia' },
    { code: 'en', name: 'Inggris' },
    { code: 'ja', name: 'Jepang' },
    { code: 'ko', name: 'Korea' },
    { code: 'zh-CN', name: 'China (Sederhana)' },
    { code: 'zh-TW', name: 'China (Tradisional)' },
    { code: 'ar', name: 'Arab' },
    { code: 'fr', name: 'Prancis' },
    { code: 'de', name: 'Jerman' },
    { code: 'es', name: 'Spanyol' },
    { code: 'pt', name: 'Portugis' },
    { code: 'it', name: 'Italia' },
    { code: 'ru', name: 'Rusia' },
    { code: 'nl', name: 'Belanda' },
    { code: 'tr', name: 'Turki' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnam' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ms', name: 'Melayu' },
    { code: 'jv', name: 'Jawa' },
    { code: 'su', name: 'Sunda' },
  ];

  const $ = (id) => document.getElementById(id);
  const sourceSelect = $('sourceLang');
  const targetSelect = $('targetLang');
  const fileInput = $('fileInput');
  const fileLabel = $('fileLabel');
  const dropZone = $('dropZone');
  const translateBtn = $('translateBtn');
  const clearBtn = $('clearBtn');
  const swapBtn = $('swapBtn');
  const progress = $('progress');
  const barFill = $('barFill');
  const progressText = $('progressText');
  const results = $('results');
  const originalText = $('originalText');
  const translatedText = $('translatedText');

  let currentFile = null;

  // Populate selects
  function populate() {
    LANGS.forEach((l) => {
      const o1 = document.createElement('option');
      o1.value = l.code;
      o1.textContent = l.name;
      sourceSelect.appendChild(o1);

      if (l.code !== 'auto') {
        const o2 = document.createElement('option');
        o2.value = l.code;
        o2.textContent = l.name;
        targetSelect.appendChild(o2);
      }
    });
    sourceSelect.value = 'auto';
    targetSelect.value = 'id';
  }

  function setFile(file) {
    if (!file) {
      currentFile = null;
      fileLabel.textContent = 'Belum ada file dipilih';
      translateBtn.disabled = true;
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast('Hanya file PDF yang didukung', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast('Ukuran file maksimal 25 MB', 'error');
      return;
    }
    currentFile = file;
    const sizeKB = (file.size / 1024).toFixed(1);
    fileLabel.textContent = `${file.name} (${sizeKB} KB)`;
    translateBtn.disabled = false;
  }

  // Toast helper
  function toast(msg, type = '') {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.className = 'toast ' + type;
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Progress
  function setProgress(percent, text) {
    progress.hidden = false;
    barFill.style.width = `${percent}%`;
    progressText.textContent = text || '';
    if (percent >= 100) {
      setTimeout(() => (progress.hidden = true), 800);
    }
  }

  // Drag & drop
  ['dragenter', 'dragover'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    })
  );
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file) setFile(file);
  });
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', (e) => setFile(e.target.files?.[0]));

  // Swap languages
  swapBtn.addEventListener('click', () => {
    if (sourceSelect.value === 'auto') {
      toast('Tidak bisa menukar saat sumber = Deteksi otomatis');
      return;
    }
    const a = sourceSelect.value;
    sourceSelect.value = targetSelect.value;
    targetSelect.value = a;
  });

  // Reset
  clearBtn.addEventListener('click', () => {
    setFile(null);
    fileInput.value = '';
    results.hidden = true;
    originalText.textContent = '';
    translatedText.textContent = '';
  });

  // Translate
  translateBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    translateBtn.disabled = true;
    setProgress(20, 'Mengunggah & mengekstrak teks PDF...');

    const fd = new FormData();
    fd.append('pdf', currentFile);
    fd.append('source', sourceSelect.value);
    fd.append('target', targetSelect.value);

    try {
      setProgress(50, 'Menerjemahkan via metode scrape...');
      const res = await fetch('/api/pdf-translate', { method: 'POST', body: fd });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Gagal memproses');
      }

      setProgress(100, 'Selesai!');
      results.hidden = false;

      if (data.warning) {
        toast(data.warning, 'error');
      }

      originalText.textContent = data.original || '(tidak ada teks)';
      translatedText.textContent = data.translated || '(tidak ada terjemahan)';

      toast(
        `Berhasil! ${data.pages} halaman, ${data.chunks} potongan diterjemahkan.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      toast('Gagal: ' + err.message, 'error');
      progress.hidden = true;
    } finally {
      translateBtn.disabled = false;
    }
  });

  // Copy / Download
  document.addEventListener('click', (e) => {
    const copyKey = e.target.getAttribute?.('data-copy');
    const dlKey = e.target.getAttribute?.('data-download');

    if (copyKey) {
      const txt = (copyKey === 'original' ? originalText : translatedText).textContent;
      if (!txt) return toast('Tidak ada teks untuk disalin');
      navigator.clipboard.writeText(txt).then(
        () => toast('Disalin ke clipboard', 'success'),
        () => toast('Gagal menyalin', 'error')
      );
    }
    if (dlKey) {
      const txt = (dlKey === 'original' ? originalText : translatedText).textContent;
      if (!txt) return toast('Tidak ada teks untuk diunduh');
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const base = (currentFile?.name || 'dmaz').replace(/\.pdf$/i, '');
      a.download = `${base}.${dlKey}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });

  populate();
  document.getElementById('year').textContent = new Date().getFullYear();
})();
