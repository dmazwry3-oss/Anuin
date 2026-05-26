// dmaz - server lokal untuk development.
// Untuk produksi pakai Netlify Functions (lihat netlify/functions/).
// Logic translate dipakai bersama dengan netlify/functions/translate.js.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Reuse logic translate dari netlify function
const translateFn = require('./netlify/functions/translate.js');

// Bridging Express -> Netlify Function handler signature
function bridge(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
      headers: req.headers,
    };
    try {
      const result = await handler(event);
      res.status(result.statusCode);
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      }
      res.send(result.body);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

app.post('/api/translate', bridge(translateFn.handler));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'dmaz',
    runtime: 'express-local',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`dmaz (dev) berjalan di http://localhost:${PORT}`);
});
