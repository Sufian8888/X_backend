const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    text: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    niche: {
      type: String,
      enum: ['ai-development-coding', 'soc-cyber-security'],
    },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TelegramAccount' },
    status: {
      type: String,
      enum: ['draft', 'ready', 'published'],
      default: 'draft',
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
