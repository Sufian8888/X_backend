const Post = require('../models/Post');
const TelegramAccount = require('../models/TelegramAccount');
const { postToX } = require('../services/xPoster');

async function publishPost(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    if (!post.text) {
      return res.status(400).json({ ok: false, error: 'Post text is required' });
    }

    // Get account from request body
    const accountId = req.body?.accountId || post.accountId;
    
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'Account ID is required' });
    }

    const account = await TelegramAccount.findById(accountId);

    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }

    console.log(`[*] Publishing with account: ${account.username}`);

    const result = await postToX(post.text, {
      username: account.username,
      password: account.password,
      headless: String(process.env.POST_HEADLESS || 'false') === 'true',
    });

    if (result.ok) {
      post.status = 'published';
      post.publishedAt = new Date();
      post.accountId = accountId;
      await post.save();
    }

    return res.json({ ok: result.ok, data: { post, result }, error: result.error });
  } catch (error) {
    console.error('[ERROR] Publishing error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  publishPost,
};
