const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    userId: { type: String, trim: true },
    profileUrl: { type: String, trim: true },
    niche: {
      type: String,
      enum: ['ai-development-coding', 'soc-cyber-security'],
      required: true,
    },
    source: { type: String, trim: true, default: 'manual' },
    searchName: { type: String, trim: true },
    searchNames: [{ type: String, trim: true }],
    lastSearchedAt: { type: Date },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    extractionRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtractionRun' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

leadSchema.index({ username: 1, niche: 1 }, { unique: true });
leadSchema.index({ niche: 1, createdAt: -1 });
leadSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
