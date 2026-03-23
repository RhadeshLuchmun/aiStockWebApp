import { NextResponse } from 'next/server';
import { connectToDatabase } from "@/DATABASE/mongoose";
import EarningsSummary from "@/DATABASE/models/EarningsSummary";
import {inngest} from "@/lib/inngest/client";
export async function GET(req: Request, { params }: { params: Promise<{ symbol: string }> }) {
    const { symbol } = await params;
    const ticker = symbol.toUpperCase();

    await connectToDatabase();
    const summary = await EarningsSummary.findOne({ symbol: ticker });

    // If no summary exists, or it's older than 90 days (stale), trigger Inngest
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    if (!summary || summary.updatedAt < ninetyDaysAgo) {
        // Fire and forget the background job
        await inngest.send({
            name: "stock.earnings.requested",
            data: { symbol: ticker }
        });

        // Tell the frontend it's generating
        return NextResponse.json({ status: "processing" });
    }

    // Return the cached summary
    return NextResponse.json({ status: "complete", data: summary });
}