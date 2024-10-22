// /frontend/pages/portfolio.js

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function Portfolio() {
  const [portfolioValue, setPortfolioValue] = useState(null);
  const [items, setItems] = useState([]);
  const [allocationResults, setAllocationResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchPortfolioValue();
    fetchItems();
  }, []);

  // Fetch portfolio value from the backend
  const fetchPortfolioValue = async () => {
    try {
      const res = await fetch("http://localhost:5000/portfolio");
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      setPortfolioValue(data.portfolio_value);
    } catch (error) {
      console.error("Error fetching portfolio value:", error);
      setErrorMessage("Error fetching portfolio value");
      setTimeout(() => {
        setErrorMessage("");
      }, 2000);
    }
  };

  // Fetch items from the backend
  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:5000/items");
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
      setErrorMessage("Error fetching items");
      setTimeout(() => {
        setErrorMessage("");
      }, 2000);
    }
  };

  // Handle Calculate Button Click
  const handleCalculate = async () => {
    if (portfolioValue === null || items.length === 0) {
      setErrorMessage("Ensure portfolio value and stock tickers are set.");
      setTimeout(() => {
        setErrorMessage("");
      }, 2000);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/calculate_portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget: portfolioValue,
          stocks: items.map((item) => item.ticker),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to calculate portfolio");
      }

      const data = await res.json();
      setAllocationResults(data);
    } catch (error) {
      console.error("Error calculating portfolio:", error);
      setErrorMessage(error.message);
      setTimeout(() => {
        setErrorMessage("");
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gray-100">
      <Link href="/">
        <a className="self-start mb-4 text-blue-500 hover:underline">
          ← Back to Home
        </a>
      </Link>

      <div className="w-full max-w-2xl p-6 border-2 border-gray-300 rounded-lg shadow-lg bg-white">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Portfolio Allocation
        </h1>

        {errorMessage && (
          <div className="mb-4 text-red-500 text-sm text-center">
            {errorMessage}
          </div>
        )}

        <div className="mb-4">
          <p className="text-lg">
            <span className="font-semibold">Budget:</span>{" "}
            {portfolioValue !== null
              ? `$${portfolioValue.toLocaleString()}`
              : "N/A"}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-lg">
            <span className="font-semibold">Selected Stocks:</span>{" "}
            {items.length > 0
              ? items.map((item) => item.ticker).join(", ")
              : "N/A"}
          </p>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-300"
        >
          Calculate Allocation
        </button>

        {allocationResults && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Allocation Results:</h2>

            {/* Weights */}
            <h3 className="text-lg font-semibold mt-4">Portfolio Weights:</h3>
            <table className="min-w-full bg-white border border-gray-200 mt-2">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Stock Ticker</th>
                  <th className="py-2 px-4 border-b">Weight</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(allocationResults["Weights"]).map(
                  ([ticker, weight]) => (
                    <tr key={ticker} className="hover:bg-gray-100">
                      <td className="py-2 px-4 border-b text-center">
                        {ticker}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {(weight * 100).toFixed(2)}%
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {/* Shares to Purchase */}
            <h3 className="text-lg font-semibold mt-4">Shares to Purchase:</h3>
            <table className="min-w-full bg-white border border-gray-200 mt-2">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Stock Ticker</th>
                  <th className="py-2 px-4 border-b">Shares</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(allocationResults["Shares to Purchase"]).map(
                  ([ticker, shares]) => (
                    <tr key={ticker} className="hover:bg-gray-100">
                      <td className="py-2 px-4 border-b text-center">
                        {ticker}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {shares}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {/* Expected Performance */}
            <h3 className="text-lg font-semibold mt-4">
              Expected Performance:
            </h3>
            <div className="mt-2">
              <p>
                <span className="font-semibold">Expected Annual Return:</span>{" "}
                {(
                  allocationResults["Expected Performance"][
                    "Expected Annual Return"
                  ] * 100
                ).toFixed(2)}
                %
              </p>
              <p>
                <span className="font-semibold">Annual Volatility:</span>{" "}
                {(
                  allocationResults["Expected Performance"][
                    "Annual Volatility"
                  ] * 100
                ).toFixed(2)}
                %
              </p>
              <p>
                <span className="font-semibold">Sharpe Ratio:</span>{" "}
                {allocationResults["Expected Performance"][
                  "Sharpe Ratio"
                ].toFixed(2)}
              </p>
            </div>

            {/* Remaining Budget */}
            <div className="mt-4">
              <p className="text-lg">
                <span className="font-semibold">Remaining Budget:</span> $
                {allocationResults["Remaining Budget"].toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
