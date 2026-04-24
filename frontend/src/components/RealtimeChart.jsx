import React, { useEffect, useRef, useState } from "react";
import { useRealtimeTrades } from "../hooks/useRealtimeTrades";

const RealtimeChart = ({ coinId, coinName }) => {
  const canvasRef = useRef(null);
  const [timeRange, setTimeRange] = useState("15m");
  const { trades } = useRealtimeTrades(coinId);
  const [filteredTrades, setFilteredTrades] = useState([]);

  useEffect(() => {
    if (!trades.length) return;
    const now = Date.now();
    let ms = 900000; // 15 min default
    switch (timeRange) {
      case "10s":
        ms = 10000;
        break;
      case "30s":
        ms = 30000;
        break;
      case "1m":
        ms = 60000;
        break;
      case "5m":
        ms = 300000;
        break;
      case "15m":
        ms = 900000;
        break;
      case "30m":
        ms = 1800000;
        break;
      case "1h":
        ms = 3600000;
        break;
      case "6h":
        ms = 21600000;
        break;
      case "1d":
        ms = 86400000;
        break;
      default:
        ms = 900000;
    }
    const cutoff = now - ms;
    const filtered = trades.filter((t) => t.timestamp >= cutoff);
    setFilteredTrades(filtered);
  }, [trades, timeRange]);

  useEffect(() => {
    if (!canvasRef.current || filteredTrades.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;
    const width = container.clientWidth - 20;
    const height = 400;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const prices = filteredTrades.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    let yMin, yMax;
    if (range === 0) {
      yMin = min * 0.999;
      yMax = max * 1.001;
    } else {
      const margin = Math.max(range * 0.05, 0.01);
      yMin = min - margin;
      yMax = max + margin;
    }
    const yRange = yMax - yMin;

    ctx.beginPath();
    filteredTrades.forEach((trade, i) => {
      const x = (i / (filteredTrades.length - 1)) * width;
      const y = height - ((trade.price - yMin) / yRange) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    const lastPrice = prices[prices.length - 1];
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText(`Min: ${min.toFixed(2)} SEK`, 10, height - 10);
    ctx.fillText(`Max: ${max.toFixed(2)} SEK`, width - 140, height - 10);
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`${lastPrice.toFixed(2)} SEK`, width - 130, 25);
  }, [filteredTrades]);

  const handleTimeChange = (range) => setTimeRange(range);

  if (!coinId) return null;

  return (
    <div className="bg-[#1E1F2E] rounded-xl p-6 mt-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="text-white font-bold text-lg">
          {coinName || coinId} – Live Trades (Real Data)
        </h4>
        <div className="flex flex-wrap gap-2">
          {["10s", "30s", "1m", "5m", "15m", "30m", "1h", "6h", "1d"].map(
            (r) => (
              <button
                key={r}
                onClick={() => handleTimeChange(r)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  timeRange === r
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {r}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="block mx-auto bg-[#0F1222] rounded-lg shadow-lg"
          style={{ width: "100%", height: "400px" }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-3 text-center">
        ⚡ Realtidspriser från Binance – varje trade uppdaterar grafen.
      </p>
    </div>
  );
};

export default RealtimeChart;
