"use client"; // Required for React state and timers

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG
} from "@/lib/constants";
import TradingViewWidget from "@/components/TradingViewWidget";

const Home = () => {
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    // 1. Create the shifting key for the Heatmap
    const [heatmapKey, setHeatmapKey] = useState(0);

    // 2. Set up the auto-refresh timer (2 minutes)
    useEffect(() => {
        const interval = setInterval(() => {
            setHeatmapKey(prev => prev + 1);
        }, 120000); // 120,000ms = 2 minutes

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        title="Market Overview"
                        scriptUrl={`${scriptUrl}market-overview.js`}
                        config={MARKET_OVERVIEW_WIDGET_CONFIG}
                        className ="custom-chart"
                        height={600}
                    />
                </div>

                {/* 3. Attach the shifting key to force React to rebuild this specific widget */}
                <div key={heatmapKey} className="md-col-span-1 xl:col-span-2">
                    <TradingViewWidget
                        title="Stock Heatmap"
                        scriptUrl={`${scriptUrl}stock-heatmap.js`}
                        config={HEATMAP_WIDGET_CONFIG}
                        className ="custom-chart"
                        height={600}
                    />
                </div>
            </section>

            <section className="grid w-full gap-8 home-section">
                <div className="h-full md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        title={""}
                        scriptUrl={`${scriptUrl}timeline.js`}
                        config={TOP_STORIES_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
                <div className="h-full md:col-span-1 xl:col-span-2">
                    <TradingViewWidget
                        title={""}
                        scriptUrl={`${scriptUrl}market-quotes.js`}
                        config={MARKET_DATA_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
            </section>
        </div>
    )
}

export default Home;