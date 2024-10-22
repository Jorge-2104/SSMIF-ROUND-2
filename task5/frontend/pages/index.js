// /frontend/pages/index.js

import React, { useState, useEffect } from "react";
import Link from "next/link"; // Import Link for navigation

// Helper validation functions
const validateStockTicker = (ticker) => {
  const tickerPattern = /^[A-Z]{1,5}$/; // 1 to 5 uppercase letters
  return tickerPattern.test(ticker);
};

const validatePositiveNumber = (number) => {
  const num = Number(number);
  return !isNaN(num) && num > 0;
};

export default function Home() {
  const [items, setItems] = useState([]);
  const [tickerInput, setTickerInput] = useState("");
  const [portfolioValue, setPortfolioValue] = useState("");
  const [displayedPortfolioValue, setDisplayedPortfolioValue] = useState(null);
  const [tickerError, setTickerError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");

  useEffect(() => {
    fetchItems();
    fetchPortfolioValue();
  }, []);

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
      setTickerError("Error fetching items");
      setTimeout(() => {
        setTickerError("");
      }, 2000);
    }
  };

  // Fetch portfolio value from the backend
  const fetchPortfolioValue = async () => {
    try {
      const res = await fetch("http://localhost:5000/portfolio");
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      setDisplayedPortfolioValue(data.portfolio_value);
    } catch (error) {
      console.error("Error fetching portfolio value:", error);
      setPortfolioError("Error fetching portfolio value");
      setTimeout(() => {
        setPortfolioError("");
      }, 2000);
    }
  };

  // Handle submission of stock ticker
  const handleTickerSubmit = async (e) => {
    e.preventDefault();

    // Validation: Ensure input is not empty and matches stock ticker pattern
    if (!validateStockTicker(tickerInput)) {
      setTickerError(
        "Must put in a valid stock ticker (1-5 uppercase letters)"
      );
      setTimeout(() => {
        setTickerError("");
      }, 2000);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: tickerInput }),
      });

      if (res.ok) {
        setTickerInput("");
        fetchItems();
      } else {
        const errorData = await res.json();
        console.error("Failed to add item:", errorData);
        setTickerError("Failed to add item");
        setTimeout(() => {
          setTickerError("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      setTickerError("Error adding item");
      setTimeout(() => {
        setTickerError("");
      }, 2000);
    }
  };

  // Handle submission of portfolio value
  const handlePortfolioSubmit = async (e) => {
    e.preventDefault();

    // Validation: Ensure input is a positive number
    if (!validatePositiveNumber(portfolioValue)) {
      setPortfolioError("Portfolio value must be a positive number");
      setTimeout(() => {
        setPortfolioError("");
      }, 2000);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: Number(portfolioValue) }),
      });

      if (res.ok) {
        setDisplayedPortfolioValue(Number(portfolioValue));
        setPortfolioValue("");
      } else {
        const errorData = await res.json();
        console.error("Failed to set portfolio value:", errorData);
        setPortfolioError("Failed to set portfolio value");
        setTimeout(() => {
          setPortfolioError("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error setting portfolio value:", error);
      setPortfolioError("Error setting portfolio value");
      setTimeout(() => {
        setPortfolioError("");
      }, 2000);
    }
  };

  // Handle deletion of an item
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/items/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchItems();
      } else {
        const errorData = await res.json();
        console.error("Failed to delete item:", errorData);
        setTickerError("Failed to delete item");
        setTimeout(() => {
          setTickerError("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setTickerError("Error deleting item");
      setTimeout(() => {
        setTickerError("");
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gray-100">
      {/* Portfolio Value Box */}
      <div className="w-full max-w-md mt-8 p-6 border-2 border-gray-300 rounded-lg shadow-lg bg-white">
        <form onSubmit={handlePortfolioSubmit} className="flex space-x-3">
          <input
            type="number"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(e.target.value)}
            className="flex-1 p-2 border-2 border-gray-300 rounded focus:outline-none focus:border-green-500"
            placeholder="Enter portfolio value"
            min="0"
          />
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            Set
          </button>
        </form>
        {portfolioError && (
          <div className="mt-2 text-red-500 text-sm">{portfolioError}</div>
        )}
        {displayedPortfolioValue !== null && (
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold">
              Portfolio Value: ${displayedPortfolioValue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Stock Ticker Box */}
      <div className="w-full max-w-md mt-4 p-6 border-2 border-gray-300 rounded-lg shadow-lg bg-white">
        <form onSubmit={handleTickerSubmit} className="flex space-x-3">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            className="flex-1 p-2 border-2 border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Enter stock ticker (e.g., AAPL)"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Add
          </button>
        </form>
        {tickerError && (
          <div className="mt-2 text-red-500 text-sm">{tickerError}</div>
        )}
      </div>

      {/* Calculate Button */}
      <div className="w-full max-w-md mt-4 flex justify-end">
        <Link href="/portfolio">
          <a className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300">
            Calculate
          </a>
        </Link>
      </div>

      {/* Table of Items */}
      <div className="w-full max-w-2xl mt-6">
        {items.length > 0 ? (
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">#</th>
                <th className="py-2 px-4 border-b">Stock Ticker</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-100">
                  <td className="py-2 px-4 border-b text-center">
                    {index + 1}
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    {item.ticker}
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-center">No items to display.</p>
        )}
      </div>
    </div>
  );
}
