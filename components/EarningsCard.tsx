"use client";
import { useEffect, useState } from "react";

export default function EarningsCard({ symbol }: { symbol: string }) {
    const [data, setData] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "processing" | "complete" | "error">("loading");

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchEarnings = async () => {
            try {
                const res = await fetch(`/api/earnings/${symbol}`);
                const json = await res.json();

                if (json.status === "processing") {
                    setStatus("processing");
                    // Poll every 5 seconds while Inngest works in the background
                    interval = setTimeout(fetchEarnings, 5000);
                } else if (json.status === "complete") {
                    setData(json.data);
                    setStatus("complete");
                }
            } catch (error) {
                setStatus("error");
            }
        };

        fetchEarnings();
        return () => clearTimeout(interval);
    }, [symbol]);

    if (status === "loading" || status === "processing") {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-6"></div>
                <div className="text-sm text-blue-400 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Gemini AI is reading the latest transcripts...
                </div>
            </div>
        );
    }

    if (status === "error" || !data) return null;

    const sentimentColor = data.sentiment === "Bullish" ? "text-emerald-400" : data.sentiment === "Bearish" ? "text-red-400" : "text-yellow-400";

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        ✨ AI Earnings Summary
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Report: {data.earningsDate}</p>
                </div>
                <span className={`px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-sm font-bold ${sentimentColor}`}>
                    {data.sentiment}
                </span>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {data.summaryText}
            </p>

            <div>
                <h4 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-3">Key Highlights</h4>
                <ul className="space-y-2">
                    {data.highlights.map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {point}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}