const cors = require('cors');
const express = require('express');
const { apiRouter } = require('./routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiRouter);

module.exports = {
  app,
};
