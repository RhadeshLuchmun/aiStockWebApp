"use client";
import React, { useMemo, useState, useEffect } from "react";

interface PortfolioButtonProps {
  symbol: string;
  currentPrice: number; // Required so we can save the buy price to the database
  showTrashIcon?: boolean;
  type?: "button" | "icon";
}

const PortfolioButton = ({
                           symbol,
                           currentPrice,
                           showTrashIcon = false,
                           type = "button",
                         }: PortfolioButtonProps) => {
  const [added, setAdded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Check MongoDB on page load to see if it's already in the portfolio
  useEffect(() => {
    fetch('/api/portfolio')
        .then(res => res.json())
        .then(data => {
          if (data.some((item: any) => item.ticker === symbol)) setAdded(true);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching portfolio:", err);
          setLoading(false);
        });
  }, [symbol]);

  // 2. Dynamic text labels
  const label = useMemo(() => {
    if (type === "icon") return "";
    if (loading) return "Loading...";
    return added ? "Remove from Portfolio" : "Add to Portfolio";
  }, [added, type, loading]);

  // 3. Handle Add/Remove to Database
  const handleClick = async () => {
    if (loading) return; // Prevent spam clicking
    setLoading(true);

    if (added) {
      // Remove from DB
      await fetch(`/api/portfolio?ticker=${symbol}`, { method: 'DELETE' });
      setAdded(false);
    } else {
      // Add to DB (Defaults to 10 shares, user can edit on the Portfolio page)
      await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, shares: 10, buyPrice: currentPrice })
      });
      setAdded(true);
    }
    setLoading(false);
  };

  // --- RENDER ICON VERSION (The Star) ---
  if (type === "icon") {
    return (
        <button
            title={added ? `Remove ${symbol} from portfolio` : `Add ${symbol} to portfolio`}
            aria-label={added ? `Remove ${symbol} from portfolio` : `Add ${symbol} to portfolio`}
            className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleClick}
            disabled={loading}
        >
          <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={added ? "#FACC15" : "none"}
              stroke="#FACC15"
              strokeWidth="1.5"
              className="watchlist-star"
          >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
            />
          </svg>
        </button>
    );
  }

  // --- RENDER TEXT BUTTON VERSION ---
  return (
      <button
          className={`watchlist-btn ${added ? "watchlist-remove" : ""} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleClick}
          disabled={loading}
      >
        {showTrashIcon && added ? (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 mr-2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
            </svg>
        ) : null}
        <span>{label}</span>
      </button>
  );
};

export default PortfolioButton;