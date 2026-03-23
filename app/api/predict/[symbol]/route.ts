import { NextResponse } from 'next/server';
import {connectToDatabase} from "@/DATABASE/mongoose";
import { Prediction } from '@/DATABASE/models/Prediction';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const ticker = symbol.toUpperCase();

    try {
        await connectToDatabase();

        // 1. Check if a fresh prediction exists (< 24h)
        const existingPrediction = await Prediction.findOne({ symbol: ticker }).lean();
        if (existingPrediction) {
            return NextResponse.json(existingPrediction);
        }

        // 2. If not, call the Python AI Engine
        // NOTE: Ensure your Python server is running on http://localhost:8000
        const pythonResponse = await fetch(`http://localhost:8000/predict/${ticker}`, {
            next: { revalidate: 0 }, // Do not cache this fetch
        });

        if (!pythonResponse.ok) {
            return NextResponse.json({ error: 'AI Engine is offline or failed' }, { status: 502 });
        }

        const aiData = await pythonResponse.json();

        // 3. Save to MongoDB for future requests
        const newPrediction = await Prediction.create({
            symbol: ticker,
            ...aiData,
        });

        return NextResponse.json(newPrediction.toJSON());
    } catch (error) {
        console.error('Prediction Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}