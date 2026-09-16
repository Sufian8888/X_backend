const express = require('express');
const { listHistory } = require('../controllers/historyController');

const historyRouter = express.Router();

historyRouter.get('/', listHistory);

module.exports = {
  historyRouter,
};
