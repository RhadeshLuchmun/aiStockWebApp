// DATABASE/models/Prediction.ts
import mongoose, { Schema, model, models } from 'mongoose';

const PredictionSchema = new Schema({
    symbol: { type: String, required: true, index: true },
    sentiment_score: Number,
    current_price: Number,
    expected_target: Number,
    max_upside_95: Number,
    value_at_risk_95: Number,
    max_portfolio_risk_pct: Number,
    graph_base64: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 86400 }
});

export const Prediction = models.Prediction || model('Prediction', PredictionSchema);