import TradingViewWidget from "@/components/TradingViewWidget";
import PortfolioButton from "@/components/PortfolioButton";
import PredictionSection from "@/components/PredictionSection";
import EarningsCard from "@/components/EarningsCard";
import YahooFinance from 'yahoo-finance2';
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";


export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  // 2. Instantiate the YahooFinance class (v3 requirement)
  const yahooFinance = new YahooFinance();

  // 3. Fetch the live price
  let livePrice = 0;
  try {
    const quote = await yahooFinance.quote(symbol);
    livePrice = quote.regularMarketPrice || 0;
  } catch (error) {
    console.error("Failed to fetch price:", error);
  }

  return (
      <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <TradingViewWidget
                title="Symbol info"
                scriptUrl={`${scriptUrl}symbol-info.js`}
                config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
                height={170}
            />

            <TradingViewWidget
                title="Advanced chart"
                scriptUrl={`${scriptUrl}advanced-chart.js`}
                config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
                className="custom-chart"
                height={600}
            />

            <PredictionSection symbol={symbol} />

          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-end">
              <PortfolioButton
                  symbol={symbol}
                  currentPrice={livePrice}
                  showTrashIcon={true}
              />
            </div>

            <TradingViewWidget
                title="Technical analysis"
                scriptUrl={`${scriptUrl}technical-analysis.js`}
                config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
                height={400}
            />

            <TradingViewWidget
                title="Company profile"
                scriptUrl={`${scriptUrl}company-profile.js`}
                config={COMPANY_PROFILE_WIDGET_CONFIG(symbol)}
                height={440}
            />

            <TradingViewWidget
                title="Financials"
                scriptUrl={`${scriptUrl}financials.js`}
                config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)}
                height={464}
            />
            <EarningsCard symbol={symbol.toUpperCase()} />
          </div>
        </section>
      </div>
  );
}