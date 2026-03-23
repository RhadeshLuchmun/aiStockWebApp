import mongoose from 'mongoose';

const PortfolioSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Clerk or NextAuth ID
    ticker: { type: String, required: true },
    shares: { type: Number, required: true, default: 1 },
    buyPrice: { type: Number, required: true },
}, { timestamps: true });

// Prevent duplicate compiles in Next.js
export default mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);