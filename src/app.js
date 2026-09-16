const cors = require('cors');
const express = require('express');
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

app.use('/api', apiRouter);

module.exports = {
  app,
};
