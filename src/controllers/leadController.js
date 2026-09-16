const Lead = require('../models/Lead');
const ExtractionRun = require('../models/ExtractionRun');
const TelegramAccount = require('../models/TelegramAccount');
const { searchXHandlers } = require('../services/xPoster');

const ALLOWED_NICHES = new Set(['ai-development-coding', 'soc-cyber-security']);
const RESERVED_HANDLES = new Set(['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search']);

function normalizeUsername(value) {
  return String(value || '')
    .replace(/^@+/, '')
    .trim()
    .toLowerCase();
}

function extractLeadsFromText(text) {
  const sourceText = String(text || '');
  const leads = new Map();

  for (const match of sourceText.matchAll(/(?:^|[^\w])@([a-zA-Z0-9_]{1,15})\b/g)) {
    const username = normalizeUsername(match[1]);
    if (username && !RESERVED_HANDLES.has(username)) {
      leads.set(username, { username, profileUrl: `https://x.com/${username}` });
    }
  }

  for (const match of sourceText.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]{1,15})\b/g)) {
    const username = normalizeUsername(match[1]);
    if (username && !RESERVED_HANDLES.has(username)) {
      leads.set(username, { username, profileUrl: `https://x.com/${username}` });
    }
  }

  for (const match of sourceText.matchAll(/\buser(?:\s*id|\s*ID|Id)?[:#\s-]+([0-9]{5,})\b/g)) {
    const userId = match[1];
    if (!leads.has(userId)) {
      leads.set(userId, { username: userId, userId, profileUrl: `https://x.com/i/user/${userId}` });
    }
  }

  return Array.from(leads.values());
}

async function listLeads(req, res) {
  try {
    const filter = {};
    if (req.query.niche) filter.niche = req.query.niche;
    if (req.query.postId) filter.postId = req.query.postId;
    if (req.query.searchName) filter.searchNames = req.query.searchName;

    const leads = await Lead.find(filter)
      .populate('postId', 'title text publishedAt')
      .sort({ createdAt: -1 });

    const totals = await Lead.aggregate([
      { $group: { _id: '$niche', count: { $sum: 1 } } },
    ]);

    res.json({ ok: true, data: leads, meta: { totals } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function createLead(req, res) {
  try {
    const username = normalizeUsername(req.body.username);
    const niche = req.body.niche;

    if (!username) {
      return res.status(400).json({ ok: false, error: 'Username is required' });
    }

    if (!ALLOWED_NICHES.has(niche)) {
      return res.status(400).json({ ok: false, error: 'Valid niche is required' });
    }

    const lead = await Lead.findOneAndUpdate(
      { username, niche },
      {
        $setOnInsert: {
          username,
          niche,
          userId: req.body.userId,
          profileUrl: req.body.profileUrl || `https://x.com/${username}`,
          source: req.body.source || 'manual',
          searchName: req.body.searchName,
          searchNames: req.body.searchName ? [req.body.searchName] : [],
          lastSearchedAt: req.body.searchName ? new Date() : undefined,
          postId: req.body.postId || undefined,
          notes: req.body.notes,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ ok: true, data: lead });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function bulkExtractLeads(req, res) {
  try {
    const niche = req.body.niche;
    if (!ALLOWED_NICHES.has(niche)) {
      return res.status(400).json({ ok: false, error: 'Valid niche is required' });
    }

    const extracted = extractLeadsFromText(req.body.sourceText);
    const run = await ExtractionRun.create({
      niche,
      source: req.body.source || 'manual',
      query: req.body.query,
      postId: req.body.postId || undefined,
      extractedCount: extracted.length,
    });

    let newCount = 0;
    let duplicateCount = 0;
    const saved = [];

    for (const lead of extracted) {
      const result = await Lead.updateOne(
        { username: lead.username, niche },
        {
          $setOnInsert: {
            ...lead,
            niche,
            source: req.body.source || 'manual',
            searchName: req.body.query,
            searchNames: req.body.query ? [req.body.query] : [],
            lastSearchedAt: req.body.query ? new Date() : undefined,
            postId: req.body.postId || undefined,
            extractionRunId: run._id,
          },
        },
        { upsert: true, runValidators: true }
      );

      if (result.upsertedCount) {
        newCount += 1;
        saved.push(lead);
      } else {
        duplicateCount += 1;
      }
    }

    run.newCount = newCount;
    run.duplicateCount = duplicateCount;
    await run.save();

    res.status(201).json({
      ok: true,
      data: {
        run,
        extracted,
        saved,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function searchHandlers(req, res) {
  try {
    const niche = req.body.niche;
    const query = String(req.body.query || '').trim();
    const accountId = req.body.accountId;
    const maxResults = Number(req.body.maxResults || 30);
    const scrollRounds = Number(req.body.scrollRounds || 8);

    if (!ALLOWED_NICHES.has(niche)) {
      return res.status(400).json({ ok: false, error: 'Valid niche is required' });
    }

    if (!query) {
      return res.status(400).json({ ok: false, error: 'Search query is required' });
    }

    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'Account ID is required' });
    }

    const account = await TelegramAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    const result = await searchXHandlers(query, {
      username: account.username,
      password: account.password,
      maxResults,
      scrollRounds,
    });

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || 'Handler search failed' });
    }

    const extracted = result.handlers || [];
    const run = await ExtractionRun.create({
      niche,
      source: 'x-user-search',
      query,
      extractedCount: extracted.length,
    });

    let newCount = 0;
    let duplicateCount = 0;
    const saved = [];

    for (const lead of extracted) {
      const username = normalizeUsername(lead.username);
      if (!username) continue;

      const writeResult = await Lead.updateOne(
        { username, niche },
        {
          $setOnInsert: {
            username,
            niche,
            profileUrl: lead.profileUrl || `https://x.com/${username}`,
            notes: `Search: ${query}`,
          },
          $set: {
            source: 'x-user-search',
            extractionRunId: run._id,
            searchName: query,
            lastSearchedAt: new Date(),
          },
          $addToSet: { searchNames: query },
        },
        { upsert: true, runValidators: true }
      );

      if (writeResult.upsertedCount) {
        newCount += 1;
        saved.push({ username, profileUrl: lead.profileUrl || `https://x.com/${username}` });
      } else {
        duplicateCount += 1;
      }
    }

    run.newCount = newCount;
    run.duplicateCount = duplicateCount;
    await run.save();

    res.status(201).json({
      ok: true,
      data: {
        run,
        extracted,
        saved,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function deleteLead(req, res) {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ ok: false, error: 'Lead not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  listLeads,
  createLead,
  bulkExtractLeads,
  searchHandlers,
  deleteLead,
};
