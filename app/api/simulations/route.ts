import { NextResponse } from 'next/server';
import { connectToDatabase } from "@/DATABASE/mongoose";
import SavedSimulation from '@/DATABASE/models/savedSimulation';

export async function POST(req) {
    await connectToDatabase();
    const data = await req.json();
    const userId = 'demo_user';

    const sim = await SavedSimulation.create({ userId, ...data });
    return NextResponse.json({ success: true, sim });
}


export async function GET(req: Request) {
    try {
        await connectToDatabase();
        // Hardcoded for demo, replace with actual auth ID later
        const userId = 'demo_user';

        // Fetch simulations sorted by newest first
        const sims = await SavedSimulation.find({ userId }).sort({ dateSaved: -1 });
        return NextResponse.json(sims);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch simulations" }, { status: 500 });
    }
}