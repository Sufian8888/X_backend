const express = require('express');
const {
  listLeads,
  createLead,
  bulkExtractLeads,
  searchHandlers,
  deleteLead,
} = require('../controllers/leadController');

const leadRouter = express.Router();

leadRouter.get('/', listLeads);
leadRouter.post('/', createLead);
leadRouter.post('/extract', bulkExtractLeads);
leadRouter.post('/search-handlers', searchHandlers);
leadRouter.delete('/:id', deleteLead);

module.exports = {
  leadRouter,
};
