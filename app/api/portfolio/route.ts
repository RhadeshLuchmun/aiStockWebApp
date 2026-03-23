import { NextResponse } from 'next/server';
import { connectToDatabase } from "@/DATABASE/mongoose";
import Portfolio from '@/DATABASE/models/Portfolio';

// GET all portfolio items for a user
export async function GET(req: Request) {
    await connectToDatabase();
    // TODO: Get actual userId from your auth session. Hardcoding 'user_123' for example.
    const userId = 'user_123';
    const items = await Portfolio.find({ userId });
    return NextResponse.json(items);
}

// POST to add or update a stock
export async function POST(req: Request) {
    await connectToDatabase();
    const { ticker, shares, buyPrice } = await req.json();
    const userId = 'user_123'; // Replace with Auth ID

    const existing = await Portfolio.findOne({ userId, ticker });
    if (existing) {
        existing.shares = shares;
        existing.buyPrice = buyPrice;
        await existing.save();
        return NextResponse.json({ message: "Updated", data: existing });
    }

    const newItem = await Portfolio.create({ userId, ticker, shares, buyPrice });
    return NextResponse.json({ message: "Added", data: newItem });
}

// DELETE to remove a stock
export async function DELETE(req: Request) {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const userId = 'user_123'; // Replace with Auth ID

    await Portfolio.findOneAndDelete({ userId, ticker });
    return NextResponse.json({ message: "Deleted" });
}