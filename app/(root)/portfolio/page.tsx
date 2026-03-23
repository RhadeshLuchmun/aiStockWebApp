"use client";
import { useState, useEffect } from 'react';

type Asset = { _id?: string, ticker: string, shares: number, buyPrice: number, currentPrice?: number };

export default function PortfolioPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [savedSims, setSavedSims] = useState<any[]>([]);
    const [days, setDays] = useState(30);
    const [paths, setPaths] = useState(1000);
    const [simData, setSimData] = useState<any>(null);
    const [loadingSim, setLoadingSim] = useState(false);
    const [saving, setSaving] = useState(false);

    // 1. Fetch Portfolio & Saved Sims strictly on first load
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const portRes = await fetch('/api/portfolio');
                const portData = await portRes.json();
                setAssets(portData);

                const simRes = await fetch('/api/simulations');
                const sims = await simRes.json();
                setSavedSims(sims);
            } catch (error) {
                console.error("Failed to load initial portfolio data:", error);
            }
        };
        fetchInitialData();
    }, []);

    // 2. The Live Price Polling Engine (Runs every 10 seconds)
    useEffect(() => {
        if (assets.length === 0) return;

        const fetchLivePrices = async () => {
            try {
                // Grab the current tickers from the state
                const tickers = assets.map(a => a.ticker).join(',');
                const priceRes = await fetch(`/api/prices?tickers=${tickers}`);
                const livePrices = await priceRes.json();

                // Seamlessly update ONLY the currentPrice of the assets without overwriting user inputs
                setAssets(prevAssets => prevAssets.map(a => ({
                    ...a,
                    currentPrice: livePrices[a.ticker] || a.currentPrice || a.buyPrice
                })));
            } catch (error) {
                console.error("Failed to fetch live prices:", error);
            }
        };

        // Fetch prices immediately once assets are loaded
        fetchLivePrices();

        // Set up the background timer to fetch every 10 seconds (10000ms)
        const intervalId = setInterval(fetchLivePrices, 10000);

        // Cleanup the timer if the user leaves the page
        return () => clearInterval(intervalId);

        // We only want to restart this timer if the NUMBER of assets changes (added/removed a stock)
    }, [assets.length]);

    const totalInvested = assets.reduce((sum, a) => sum + (a.shares * a.buyPrice), 0);
    const currentValue = assets.reduce((sum, a) => sum + (a.shares * (a.currentPrice || a.buyPrice)), 0);
    const totalReturnPct = totalInvested === 0 ? 0 : ((currentValue - totalInvested) / totalInvested) * 100;

    // --- INTERACTIVE HANDLERS ---
    const updateShares = (ticker: string, newShares: number) => {
        setAssets(assets.map(a => a.ticker === ticker ? { ...a, shares: newShares } : a));
    };

    const updateBuyPrice = (ticker: string, newPrice: number) => {
        setAssets(assets.map(a => a.ticker === ticker ? { ...a, buyPrice: newPrice } : a));
    };

    const removeAsset = async (ticker: string) => {
        setAssets(assets.filter(a => a.ticker !== ticker));
        await fetch(`/api/portfolio?ticker=${ticker}`, { method: 'DELETE' });
    };

    // --- API HANDLERS ---
    const runSimulation = async () => {
        setLoadingSim(true);
        try {
            const payload = {
                assets: assets.map(a => ({ ticker: a.ticker, shares: a.shares })),
                days: days,
                paths: paths
            };
            const res = await fetch('http://localhost:8000/portfolio-predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Server Error: ${data.detail || 'Simulation Failed'}`);
                setLoadingSim(false);
                return;
            }

            setSimData(data);
        } catch (err) {
            console.error(err);
            alert("Simulation failed. Ensure FastAPI is running on port 8000.");
        }
        setLoadingSim(false);
    };

    // const saveSimulation = async () => {
    //     setSaving(true);
    //     try {
    //         const res = await fetch('/api/simulations', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ ...simData, days, paths })
    //         });
    //         const savedData = await res.json();
    //
    //         if (savedData.success) {
    //             alert("Simulation saved successfully!");
    //             setSavedSims([savedData.simulation, ...savedSims]);
    //         }
    //     } catch (err) {
    //         alert("Failed to save simulation.");
    //     }
    //     setSaving(false);
    // };
    const saveSimulation = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/simulations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...simData, days, paths })
            });
            const savedData = await res.json();

            // STRICT CHECK: Ensure the simulation data actually came back
            if (savedData.success && savedData.simulation) {
                alert("Simulation saved successfully!");
                setSavedSims([savedData.simulation, ...savedSims]);
                setSimData(savedData.simulation); // Updates the active view so the save button hides
            } else {
                alert("Failed to save: Database returned an empty object.");
            }
        } catch (err) {
            alert("Failed to save simulation.");
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8">

                {/* LEFT COLUMN: Main Workspace */}
                <div className="flex-1">
                    <h1 className="text-4xl font-bold mb-8 text-white tracking-tight">✨AI Monte Carlo Portfolio Engine</h1>

                    {/* --- ASSET TABLE --- */}
                    <div className="bg-slate-900 rounded-xl p-6 shadow-2xl mb-8 border border-slate-800 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                                <th className="pb-4 font-semibold">Asset</th>
                                <th className="pb-4 font-semibold">Shares</th>
                                <th className="pb-4 font-semibold">Avg Buy Price</th>
                                <th className="pb-4 font-semibold">Live Price</th>
                                <th className="pb-4 font-semibold text-right">Return</th>
                                <th className="pb-4 font-semibold text-center">Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {assets.map((asset) => {
                                const currentPrice = asset.currentPrice || asset.buyPrice;
                                const retPct = ((currentPrice - asset.buyPrice) / asset.buyPrice) * 100;
                                const isPos = retPct >= 0;
                                return (
                                    <tr key={asset.ticker} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-4 flex items-center gap-3">
                                            <img src={`https://logo.clearbit.com/${asset.ticker.toLowerCase()}.com`} alt="" className="w-8 h-8 rounded-full bg-white object-contain p-1" onError={(e) => e.currentTarget.style.display='none'}/>
                                            <span className="font-bold text-lg text-white">{asset.ticker}</span>
                                        </td>
                                        <td className="py-4">
                                            <input
                                                type="number" min="0" step="1"
                                                value={asset.shares}
                                                onChange={(e) => updateShares(asset.ticker, Number(e.target.value))}
                                                className="bg-slate-950 border border-slate-700 rounded px-3 py-1 w-20 text-white focus:border-blue-500 outline-none transition-colors"
                                            />
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center">
                                                <span className="text-slate-400 mr-1">$</span>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={asset.buyPrice}
                                                    onChange={(e) => updateBuyPrice(asset.ticker, Number(e.target.value))}
                                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-24 text-white focus:border-blue-500 outline-none transition-colors"
                                                />
                                            </div>
                                        </td>
                                        {/* Watch this column tick live! */}
                                        <td className="py-4 font-mono">${currentPrice.toFixed(2)}</td>
                                        <td className={`py-4 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {isPos ? '+' : ''}{retPct.toFixed(2)}%
                                        </td>
                                        <td className="py-4 text-center">
                                            <button onClick={() => removeAsset(asset.ticker)} className="text-slate-500 hover:text-red-500 transition-colors" title="Remove Asset">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mx-auto">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>

                        {/* TOTALS FOOTER */}
                        <div className="mt-6 flex flex-wrap justify-between items-center bg-slate-950 p-5 rounded-lg border border-slate-800">
                            <div>
                                <p className="text-sm text-slate-400">Total Invested</p>
                                <p className="text-2xl font-bold text-white">${totalInvested.toFixed(2)}</p>
                            </div>
                            <div className="text-right mt-4 sm:mt-0">
                                <p className="text-sm text-slate-400">Live Return</p>
                                <p className={`text-2xl font-bold ${totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* --- SIMULATION CONTROLS --- */}
                    <div className="flex flex-wrap items-end gap-6 mb-8 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-400">Time Horizon</label>
                            <div className="flex items-center bg-slate-950 border border-slate-700 rounded overflow-hidden">
                                <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent px-4 py-2 w-24 text-white outline-none" />
                                <span className="px-3 text-slate-500 bg-slate-900 border-l border-slate-700 py-2">Days</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-400">Monte Carlo Paths</label>
                            <input type="number" value={paths} onChange={(e) => setPaths(Number(e.target.value))} className="bg-slate-950 border border-slate-700 rounded px-4 py-2 w-32 text-white outline-none focus:border-blue-500" />
                        </div>
                        <button
                            onClick={runSimulation}
                            disabled={loadingSim || assets.length < 2}
                            className="ml-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-900/50"
                        >
                            {loadingSim ? 'Compiling Matrices...' : 'RUN AI MONTE CARLO SIMULATION'}
                        </button>
                    </div>

                    {/* --- REPORT OUTPUT --- */}
                    {simData && (
                        <div className="bg-slate-900 rounded-xl p-8 shadow-2xl border border-slate-800 animate-fade-in-up">
                            <div className="border-b border-slate-700 pb-4 mb-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold tracking-widest text-slate-300">INSTITUTIONAL RISK REPORT</h2>
                                {simData.dateSaved && <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">Viewing Archive: {new Date(simData.dateSaved).toLocaleDateString()}</span>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4 text-lg">
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">Starting Macro Regime:</span>
                                        <span className="font-bold text-red-400">{simData.start_regime}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">FinBERT NLP Sentiment:</span>
                                        <span className="font-bold text-white">{simData.sentiment}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">Initial Investment:</span>
                                        <span className="font-bold text-white">${simData.initial_value.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 text-lg">
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">Expected Value (Mean):</span>
                                        <span className="font-bold text-emerald-400">
                                            ${simData.expected_mean.toLocaleString()}
                                            <span className="text-sm opacity-70 ml-2">({(((simData.expected_mean/simData.initial_value)-1)*100).toFixed(1)}%)</span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">95% Best Case (Bull):</span>
                                        <span className="font-bold text-green-500">
                                            ${simData.best_case_95.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-2">
                                        <span className="text-slate-400">95% VaR (Worst Case):</span>
                                        <span className="font-bold text-red-500">
                                            ${simData.var_95.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-950/20 p-6 rounded-lg border border-red-900/30 text-center mb-8">
                                <p className="text-red-500 font-bold mb-4 tracking-widest text-sm">EXTREME TAIL RISK ANALYSIS</p>
                                <div className="flex flex-wrap justify-around gap-4 text-base">
                                    <p className="text-slate-400">Max Expected Loss:<br/><span className="text-white font-bold text-xl">${(simData.initial_value - simData.var_95).toLocaleString()}</span></p>
                                    <p className="text-slate-400">95% CVaR (Crash Risk):<br/><span className="text-white font-bold text-xl">${simData.cvar_95.toLocaleString()}</span></p>
                                    <p className="text-slate-400">Avg Tail Loss:<br/><span className="text-white font-bold text-xl">${(simData.initial_value - simData.cvar_95).toLocaleString()}</span></p>
                                </div>
                            </div>

                            <img src={`data:image/png;base64,${simData.graph_base64}`} alt="Simulation Chart" className="w-full rounded-lg shadow-2xl border border-slate-700 mb-6" />

                            {!simData._id && (
                                <div className="flex justify-center mt-8">
                                    <button
                                        onClick={saveSimulation}
                                        disabled={saving}
                                        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-3 px-12 rounded-lg transition-all shadow-lg shadow-emerald-900/50"
                                    >
                                        {saving ? 'Saving to Database...' : 'Save Simulation Report'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: History Sidebar */}
                <div className="w-full xl:w-80 flex flex-col gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl sticky top-8">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Saved Reports
                        </h3>
                        {savedSims.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No saved simulations yet. Run an analysis and click save to archive it here.</p>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {savedSims.map((sim, idx) => {
                                    // SAFETY GUARD: Skip empty elements
                                    if (!sim) return null;

                                    return (
                                        <button
                                            key={sim._id || idx}
                                            onClick={() => setSimData(sim)}
                                            className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-4 rounded-lg transition-all group"
                                        >
                                            <p className="text-xs text-slate-400 mb-1">
                                                {sim.dateSaved ? new Date(sim.dateSaved).toLocaleDateString() : 'Just now'} • {sim.days || 0} Days
                                            </p>
                                            <p className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                                ${sim.initial_value?.toLocaleString() || 0} Portfolio
                                            </p>
                                            <p className={`text-sm font-bold ${(sim.expected_mean || 0) >= (sim.initial_value || 0) ? 'text-emerald-500' : 'text-red-500'}`}>
                                                Exp: ${sim.expected_mean?.toLocaleString() || 0}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {/*{savedSims.length === 0 ? (*/}
                        {/*    <p className="text-sm text-slate-500 italic">No saved simulations yet. Run an analysis and click save to archive it here.</p>*/}
                        {/*) : (*/}
                        {/*    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">*/}
                        {/*        {savedSims.map((sim, idx) => (*/}
                        {/*            <button*/}
                        {/*                key={sim._id || idx}*/}
                        {/*                onClick={() => setSimData(sim)}*/}
                        {/*                className="text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-4 rounded-lg transition-all group"*/}
                        {/*            >*/}
                        {/*                <p className="text-xs text-slate-400 mb-1">{new Date(sim.dateSaved).toLocaleDateString()} • {sim.days} Days</p>*/}
                        {/*                <p className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">${sim.initial_value.toLocaleString()} Portfolio</p>*/}
                        {/*                <p className={`text-sm font-bold ${sim.expected_mean >= sim.initial_value ? 'text-emerald-500' : 'text-red-500'}`}>*/}
                        {/*                    Exp: ${sim.expected_mean.toLocaleString()}*/}
                        {/*                </p>*/}
                        {/*            </button>*/}
                        {/*        ))}*/}
                        {/*    </div>*/}
                        {/*)}*/}
                    </div>
                </div>

            </div>
        </div>
    );
}