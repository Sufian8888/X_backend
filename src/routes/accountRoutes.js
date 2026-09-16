const express = require('express');
const {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  loginAccount,
} = require('../controllers/accountController');

const accountRouter = express.Router();

accountRouter.get('/', listAccounts);
accountRouter.post('/', createAccount);
accountRouter.post('/:id/login', loginAccount);
accountRouter.put('/:id', updateAccount);
accountRouter.delete('/:id', deleteAccount);

module.exports = {
  accountRouter,
};
