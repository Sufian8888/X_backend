const ExtractionRun = require('../models/ExtractionRun');
const Post = require('../models/Post');
const Lead = require('../models/Lead');

async function listHistory(req, res) {
  try {
    const runs = await ExtractionRun.find()
      .populate('postId', 'title text status publishedAt')
      .sort({ createdAt: -1 });

    const publishedPosts = await Post.find({ status: 'published' })
      .populate('accountId', 'username')
      .sort({ publishedAt: -1, updatedAt: -1 });

    const leadCounts = await Lead.aggregate([
      { $match: { postId: { $ne: null } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);

    const countByPostId = new Map(leadCounts.map((item) => [String(item._id), item.count]));

    res.json({
      ok: true,
      data: {
        extractionRuns: runs,
        publishedPosts: publishedPosts.map((post) => ({
          ...post.toObject(),
          leadCount: countByPostId.get(String(post._id)) || 0,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = {
  listHistory,
};
