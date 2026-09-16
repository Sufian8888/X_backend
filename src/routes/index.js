const express = require('express');
const { accountRouter } = require('./accountRoutes');
const { postRouter } = require('./postRoutes');
const { actionRouter } = require('./actionRoutes');
const { authRouter } = require('./authRoutes');
const { leadRouter } = require('./leadRoutes');
const { historyRouter } = require('./historyRoutes');
const { requireAuth } = require('../controllers/authController');

const apiRouter = express.Router();

// Public routes — no authentication required
apiRouter.use('/auth', authRouter);

// Protected routes — require a valid auth token
apiRouter.use('/accounts', requireAuth, accountRouter);
apiRouter.use('/posts', requireAuth, postRouter);
apiRouter.use('/actions', requireAuth, actionRouter);
apiRouter.use('/leads', requireAuth, leadRouter);
apiRouter.use('/history', requireAuth, historyRouter);

module.exports = {
  apiRouter,
};
