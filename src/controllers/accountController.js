const TelegramAccount = require('../models/TelegramAccount');
const { loginToX } = require('../services/xPoster');

async function listAccounts(req, res) {
  try {
    const accounts = await TelegramAccount.find().sort({ createdAt: -1 });
    res.json({ ok: true, data: accounts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function createAccount(req, res) {
  try {
    const account = await TelegramAccount.create(req.body);
    res.status(201).json({ ok: true, data: account });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function updateAccount(req, res) {
  try {
    const account = await TelegramAccount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    res.json({ ok: true, data: account });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function deleteAccount(req, res) {
  try {
    const account = await TelegramAccount.findByIdAndDelete(req.params.id);

    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function loginAccount(req, res) {
  try {
    const account = await TelegramAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    console.log(`[*] Logging in with account: ${account.username}`);

    const result = await loginToX({
      username: account.username,
      password: account.password,
    });

    return res.json({ ok: result.ok, data: result, error: result.error });
  } catch (error) {
    console.error('[ERROR] Login error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  loginAccount,
};
