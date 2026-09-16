const Post = require('../models/Post');

function splitTags(tagsValue) {
  if (Array.isArray(tagsValue)) {
    return tagsValue.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tagsValue === 'string') {
    return tagsValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

async function listPosts(req, res) {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ ok: true, data: posts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function createPost(req, res) {
  try {
    const payload = {
      title: req.body.title,
      text: req.body.text,
      imageUrl: req.body.imageUrl,
      tags: splitTags(req.body.tags),
      niche: req.body.niche || undefined,
      accountId: req.body.accountId || undefined,
      status: req.body.status || 'draft',
    };

    const post = await Post.create(payload);
    res.status(201).json({ ok: true, data: post });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function updatePost(req, res) {
  try {
    const payload = {
      title: req.body.title,
      text: req.body.text,
      imageUrl: req.body.imageUrl,
      tags: splitTags(req.body.tags),
      niche: req.body.niche || undefined,
      accountId: req.body.accountId || undefined,
      status: req.body.status,
    };

    const post = await Post.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    res.json({ ok: true, data: post });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function deletePost(req, res) {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  listPosts,
  createPost,
  updatePost,
  deletePost,
};
