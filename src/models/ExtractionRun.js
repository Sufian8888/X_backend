const mongoose = require('mongoose');

const extractionRunSchema = new mongoose.Schema(
  {
    niche: {
      type: String,
      enum: ['ai-development-coding', 'soc-cyber-security'],
      required: true,
    },
    source: { type: String, trim: true, default: 'manual' },
    query: { type: String, trim: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    extractedCount: { type: Number, default: 0 },
    newCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

extractionRunSchema.index({ createdAt: -1 });
extractionRunSchema.index({ niche: 1, createdAt: -1 });
extractionRunSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model('ExtractionRun', extractionRunSchema);
