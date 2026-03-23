import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tickersStr = searchParams.get('tickers');

    if (!tickersStr) return NextResponse.json({});

    const tickers = tickersStr.split(',');
    const yahooFinance = new YahooFinance();
    const prices: Record<string, number> = {};

    try {
        // Fetch all quotes concurrently for speed
        const quotes = await Promise.all(
            tickers.map(t => yahooFinance.quote(t).catch(() => null))
        );

        quotes.forEach((q, index) => {
            if (q && q.regularMarketPrice) {
                prices[tickers[index]] = q.regularMarketPrice;
            }
        });

        return NextResponse.json(prices);
    } catch (error) {
        console.error("Pricing error:", error);
        return NextResponse.json({}, { status: 500 });
    }
}