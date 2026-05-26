// dmaz - frontend
// Ekstrak teks PDF di browser pakai pdf.js, kirim ke Netlify Function /api/translate.
(() => {
  // Konfigurasi worker pdf.js (versi harus sama dengan yang di-load di index.html)
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Daftar bahasa lengkap (kode Google Translate -> nama Indonesia)
  // Mengikuti daftar yang muncul pada UI translate.google.com
  const LANGS = [
    { code: 'auto', name: 'Deteksi otomatis', src: true },
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Albania' },
    { code: 'am', name: 'Amharik' },
    { code: 'ar', name: 'Arab' },
    { code: 'hy', name: 'Armenia' },
    { code: 'as', name: 'Assam' },
    { code: 'ay', name: 'Aymara' },
    { code: 'az', name: 'Azerbaijan' },
    { code: 'bm', name: 'Bambara' },
    { code: 'eu', name: 'Bask' },
    { code: 'be', name: 'Belarussia' },
    { code: 'bn', name: 'Bengali' },
    { code: 'bho', name: 'Bhojpuri' },
    { code: 'bs', name: 'Bosnia' },
    { code: 'bg', name: 'Bulgaria' },
    { code: 'ca', name: 'Katalan' },
    { code: 'ceb', name: 'Sebuano' },
    { code: 'ny', name: 'Chichewa' },
    { code: 'zh-CN', name: 'China (Aks. Sederhana)' },
    { code: 'zh-TW', name: 'China (Aks. Tradisional)' },
    { code: 'co', name: 'Korsika' },
    { code: 'hr', name: 'Kroasia' },
    { code: 'cs', name: 'Ceko' },
    { code: 'da', name: 'Denmark' },
    { code: 'dv', name: 'Divehi' },
    { code: 'doi', name: 'Dogri' },
    { code: 'nl', name: 'Belanda' },
    { code: 'en', name: 'Inggris' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Estonia' },
    { code: 'ee', name: 'Ewe' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'fi', name: 'Finlandia' },
    { code: 'fr', name: 'Prancis' },
    { code: 'fy', name: 'Frisia' },
    { code: 'gl', name: 'Galisia' },
    { code: 'lg', name: 'Luganda' },
    { code: 'ka', name: 'Georgia' },
    { code: 'de', name: 'Jerman' },
    { code: 'el', name: 'Yunani' },
    { code: 'gn', name: 'Guarani' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ht', name: 'Kreol Haiti' },
    { code: 'ha', name: 'Hausa' },
    { code: 'haw', name: 'Hawaii' },
    { code: 'iw', name: 'Ibrani' },
    { code: 'hi', name: 'Hindi' },
    { code: 'hmn', name: 'Hmong' },
    { code: 'hu', name: 'Hungaria' },
    { code: 'is', name: 'Islandia' },
    { code: 'ig', name: 'Igbo' },
    { code: 'ilo', name: 'Iloko' },
    { code: 'id', name: 'Indonesia' },
    { code: 'ga', name: 'Gaelig' },
    { code: 'it', name: 'Italia' },
    { code: 'ja', name: 'Jepang' },
    { code: 'jw', name: 'Jawa' },
    { code: 'kn', name: 'Kannada' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'km', name: 'Khmer' },
    { code: 'rw', name: 'Kinyarwanda' },
    { code: 'gom', name: 'Konkani' },
    { code: 'ko', name: 'Korea' },
    { code: 'kri', name: 'Krio' },
    { code: 'ku', name: 'Kurdi (Kurmanji)' },
    { code: 'ckb', name: 'Kurdi (Sorani)' },
    { code: 'ky', name: 'Kirgiz' },
    { code: 'lo', name: 'Lao' },
    { code: 'la', name: 'Latin' },
    { code: 'lv', name: 'Latvia' },
    { code: 'ln', name: 'Lingala' },
    { code: 'lt', name: 'Lituania' },
    { code: 'lb', name: 'Luksemburg' },
    { code: 'mk', name: 'Makedonia' },
    { code: 'mai', name: 'Maithili' },
    { code: 'mg', name: 'Malagasi' },
    { code: 'ms', name: 'Melayu' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'mt', name: 'Malta' },
    { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' },
    { code: 'mni-Mtei', name: 'Meitei (Manipuri)' },
    { code: 'lus', name: 'Mizo' },
    { code: 'mn', name: 'Mongolia' },
    { code: 'my', name: 'Myanmar' },
    { code: 'ne', name: 'Nepal' },
    { code: 'no', name: 'Norwegia' },
    { code: 'or', name: 'Odia (Oriya)' },
    { code: 'om', name: 'Oromo' },
    { code: 'ps', name: 'Pashto' },
    { code: 'fa', name: 'Farsi' },
    { code: 'pl', name: 'Polandia' },
    { code: 'pt', name: 'Portugis' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'qu', name: 'Quechua' },
    { code: 'ro', name: 'Rumania' },
    { code: 'ru', name: 'Rusia' },
    { code: 'sm', name: 'Samoa' },
    { code: 'sa', name: 'Sanskerta' },
    { code: 'gd', name: 'Gaelik Skotlandia' },
    { code: 'nso', name: 'Sepedi' },
    { code: 'sr', name: 'Serb' },
    { code: 'st', name: 'Sesotho' },
    { code: 'sn', name: 'Shona' },
    { code: 'sd', name: 'Sindhi' },
    { code: 'si', name: 'Sinhala' },
    { code: 'sk', name: 'Slovakia' },
    { code: 'sl', name: 'Slovenia' },
    { code: 'so', name: 'Somali' },
    { code: 'es', name: 'Spanyol' },
    { code: 'su', name: 'Sunda' },
    { code: 'sw', name: 'Swahili' },
    { code: 'sv', name: 'Swedia' },
    { code: 'tg', name: 'Tajik' },
    { code: 'ta', name: 'Tamil' },
    { code: 'tt', name: 'Tatar' },
    { code: 'te', name: 'Telugu' },
    { code: 'th', name: 'Thai' },
    { code: 'ti', name: 'Tigrinya' },
    { code: 'ts', name: 'Tsonga' },
    { code: 'tr', name: 'Turki' },
    { code: 'tk', name: 'Turkmen' },
    { code: 'ak', name: 'Twi' },
    { code: 'uk', name: 'Ukraina' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ug', name: 'Uyghur' },
    { code: 'uz', name: 'Uzbek' },
    { code: 'vi', name: 'Vietnam' },
    { code: 'cy', name: 'Welsh' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'yi', name: 'Yiddi' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'zu', name: 'Zulu' },
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
  let extractedText = '';

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
      extractedText = '';
      fileLabel.textContent = 'Belum ada file dipilih';
      translateBtn.disabled = true;
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast('Hanya file PDF yang didukung', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast('Ukuran file maksimal 50 MB', 'error');
      return;
    }
    currentFile = file;
    extractedText = '';
    const sizeKB = (file.size / 1024).toFixed(1);
    fileLabel.textContent = `${file.name} (${sizeKB} KB)`;
    translateBtn.disabled = false;
  }

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
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function setProgress(percent, text) {
    progress.hidden = false;
    barFill.style.width = `${percent}%`;
    progressText.textContent = text || '';
    if (percent >= 100) {
      setTimeout(() => (progress.hidden = true), 800);
    }
  }

  // ====================== Drag & Drop ======================
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
  fileInput.addEventListener('change', (e) => setFile(e.target.files?.[0]));

  // Tukar bahasa
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

  // ====================== Ekstraksi PDF (browser) ======================
  async function extractPdfText(file, onProgress) {
    if (!window.pdfjsLib) {
      throw new Error('pdf.js belum termuat. Cek koneksi internet.');
    }
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const pages = pdf.numPages;
    const out = [];
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      // Susun item supaya newline antar baris terjaga
      let lastY = null;
      const lines = [];
      let line = '';
      for (const item of tc.items) {
        const y = item.transform?.[5];
        if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 1) {
          if (line) lines.push(line);
          line = '';
        }
        line += (line ? ' ' : '') + (item.str || '');
        if (y !== undefined) lastY = y;
      }
      if (line) lines.push(line);
      out.push(lines.join('\n'));
      if (onProgress) onProgress(i, pages);
    }
    return { text: out.join('\n\n'), pages };
  }

  // ====================== Translate ======================
  translateBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    translateBtn.disabled = true;
    results.hidden = true;
    originalText.textContent = '';
    translatedText.textContent = '';

    try {
      setProgress(5, 'Membuka PDF...');
      const { text, pages } = await extractPdfText(currentFile, (cur, total) => {
        const p = 5 + Math.round((cur / total) * 45); // 5-50%
        setProgress(p, `Mengekstrak teks halaman ${cur}/${total}...`);
      });

      extractedText = text;
      originalText.textContent = text || '(tidak ada teks ditemukan)';

      if (!text.trim()) {
        results.hidden = false;
        setProgress(100, 'Selesai (PDF tidak memuat teks)');
        toast('PDF tidak memuat teks. Mungkin hasil scan / gambar.', 'error');
        translateBtn.disabled = false;
        return;
      }

      setProgress(60, `Menerjemahkan ${pages} halaman via scrape Google Translate...`);

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source: sourceSelect.value,
          target: targetSelect.value,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal menerjemahkan');
      }

      translatedText.textContent = data.result || '(tidak ada terjemahan)';
      results.hidden = false;
      setProgress(100, 'Selesai!');

      const note = data.truncated
        ? ` (teks dipotong di ${data.originalLength.toLocaleString()} -> 80.000 karakter karena batas Function)`
        : '';
      toast(
        `Berhasil! ${pages} hal · ${data.chunks} potongan${note}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      progress.hidden = true;
      toast('Gagal: ' + err.message, 'error');
    } finally {
      translateBtn.disabled = false;
    }
  });

  // ====================== Copy / Download ======================
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
