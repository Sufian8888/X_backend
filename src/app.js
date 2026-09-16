const cors = require('cors');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { apiRouter } = require('./routes');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://x-frontend-s6ce.onrender.com',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/debug/runtime', (req, res) => {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), '.cache', 'puppeteer');

  res.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV || null,
    port: process.env.PORT || null,
    frontendOrigin: process.env.FRONTEND_ORIGIN || null,
    postHeadless: process.env.POST_HEADLESS || null,
    hasPuppeteerExecutablePath: Boolean(process.env.PUPPETEER_EXECUTABLE_PATH),
    hasChromeBin: Boolean(process.env.CHROME_BIN),
    puppeteerCacheDir: cacheDir,
    puppeteerCacheExists: fs.existsSync(cacheDir),
    cwd: process.cwd(),
  });
});

app.use('/api', apiRouter);

module.exports = {
  app,
};
