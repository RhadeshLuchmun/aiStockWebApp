import { Schema, model, models } from 'mongoose';

const EarningsSummarySchema = new Schema({
    symbol: { type: String, required: true, unique: true },
    earningsDate: { type: String }, // e.g., "Q4 2025 (Jan 28)"
    summaryText: { type: String, required: true },
    highlights: [{ type: String }],
    sentiment: { type: String }, // Bullish, Bearish, or Neutral
    updatedAt: { type: Date, default: Date.now }
});

export default models.EarningsSummary || model('EarningsSummary', EarningsSummarySchema);