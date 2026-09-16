const express = require('express');
const { publishPost } = require('../controllers/actionController');

const actionRouter = express.Router();

actionRouter.post('/publish/:id', publishPost);

module.exports = {
  actionRouter,
};
