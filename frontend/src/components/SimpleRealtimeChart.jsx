import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const SimpleRealtimeChart = ({ coinId, coinName }) => {
  const canvasRef = useRef(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [askHistory, setAskHistory] = useState([]);
  const [lastBid, setLastBid] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);
  const [timeRange, setTimeRange] = useState("15m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SPREAD = 0.0015; // 0.15% spread

  // Generera mockdata med spread
  const generateMockData = (range, basePrice) => {
    let points = 0;
    if (range === "10s") points = 10;
    else if (range === "30s") points = 30;
    else if (range === "1m") points = 60;
    else return null;

    const bidMock = [];
    const askMock = [];
    let price = basePrice;
    const now = Date.now();
    const stepMs = 1000;
    for (let i = points; i >= 0; i--) {
      const change = (Math.random() - 0.5) * 0.015; // lite högre volatilitet för mock
      price = price * (1 + change);
      price = Math.max(1000, Math.min(200000, price));
      const bid = price * (1 - SPREAD);
      const ask = price * (1 + SPREAD);
      bidMock.push({ timestamp: now - i * stepMs, price: bid });
      askMock.push({ timestamp: now - i * stepMs, price: ask });
    }
    return { bidMock, askMock };
  };

  useEffect(() => {
    if (!coinId) return;
    let interval = null;
    let isMounted = true;

    const fetchData = async () => {
      try {
        setError(null);
        if (timeRange === "10s" || timeRange === "30s" || timeRange === "1m") {
          let basePrice = 50000;
          try {
            const priceRes = await axios.get(
              `/api/crypto/history/${coinId}?minutes=1`,
            );
            if (priceRes.data && priceRes.data.length > 0) {
              basePrice = priceRes.data[priceRes.data.length - 1].price;
            }
          } catch (err) {}
          const { bidMock, askMock } = generateMockData(timeRange, basePrice);
          if (bidMock && askMock && isMounted) {
            setBidHistory(bidMock);
            setAskHistory(askMock);
            setLastBid(bidMock[bidMock.length - 1]?.price);
            setLastAsk(askMock[askMock.length - 1]?.price);
            setLoading(false);
          }
          return;
        }

        let query = "";
        switch (timeRange) {
          case "5m":
            query = "?minutes=5";
            break;
          case "15m":
            query = "?minutes=15";
            break;
          case "30m":
            query = "?minutes=30";
            break;
          case "1h":
            query = "?hours=1";
            break;
          case "6h":
            query = "?hours=6";
            break;
          case "1d":
            query = "?days=1";
            break;
          default:
            query = "?minutes=15";
        }
        const url = `/api/crypto/history/${coinId}${query}`;
        const res = await axios.get(url);
        if (isMounted && res.data && res.data.length > 0) {
          const bidPrices = res.data.map((p) => ({
            timestamp: p.timestamp,
            price: p.price * (1 - SPREAD),
          }));
          const askPrices = res.data.map((p) => ({
            timestamp: p.timestamp,
            price: p.price * (1 + SPREAD),
          }));
          setBidHistory(bidPrices);
          setAskHistory(askPrices);
          setLastBid(bidPrices[bidPrices.length - 1]?.price);
          setLastAsk(askPrices[askPrices.length - 1]?.price);
          setLoading(false);
        } else if (isMounted) {
          setError("Ingen data från backend");
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message);
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalMs =
      timeRange === "10s" || timeRange === "30s" || timeRange === "1m"
        ? 1000
        : 10000;
    interval = setInterval(fetchData, intervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [coinId, timeRange]);

  // Rita grafen med två linjer
  useEffect(() => {
    if (
      !canvasRef.current ||
      (bidHistory.length === 0 && askHistory.length === 0)
    )
      return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;
    const width = container.clientWidth - 20;
    const height = 400;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const allPrices = [
      ...bidHistory.map((p) => p.price),
      ...askHistory.map((p) => p.price),
    ];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
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

    // Rita bid (grön)
    if (bidHistory.length > 1) {
      ctx.beginPath();
      bidHistory.forEach((point, i) => {
        const x = (i / (bidHistory.length - 1)) * width;
        const y = height - ((point.price - yMin) / yRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Rita ask (röd)
    if (askHistory.length > 1) {
      ctx.beginPath();
      askHistory.forEach((point, i) => {
        const x = (i / (askHistory.length - 1)) * width;
        const y = height - ((point.price - yMin) / yRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [bidHistory, askHistory]);

  const handleTimeChange = (range) => {
    setTimeRange(range);
    setLoading(true);
    setBidHistory([]);
    setAskHistory([]);
    setLastBid(null);
    setLastAsk(null);
    setError(null);
  };

  if (!coinId) return null;

  return (
    <div className="bg-[#1E1F2E] rounded-xl p-6 mt-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="text-white font-bold text-lg">
          {coinName || coinId} – Köp/Sälj (realtid)
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
      {!loading && !error && (lastBid || lastAsk) && (
        <div className="flex justify-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-xs">Köppris (Bid)</p>
            <p className="text-green-400 text-xl font-bold">
              {lastBid?.toFixed(6)} SEK
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-xs">Säljpris (Ask)</p>
            <p className="text-red-400 text-xl font-bold">
              {lastAsk?.toFixed(6)} SEK
            </p>
          </div>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-400 text-sm font-medium">Laddar graf...</p>
        </div>
      )}
      {!loading && error && (
        <p className="text-red-400 text-center py-10">{error}</p>
      )}
      {!loading &&
        !error &&
        bidHistory.length === 0 &&
        askHistory.length === 0 && (
          <p className="text-gray-400 text-center py-10">Ingen data att visa</p>
        )}
      {!loading &&
        !error &&
        (bidHistory.length > 0 || askHistory.length > 0) && (
          <div className="w-full overflow-x-auto">
            <canvas
              ref={canvasRef}
              className="block mx-auto bg-[#0F1222] rounded-lg shadow-lg"
              style={{ width: "100%", height: "400px" }}
            />
          </div>
        )}
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500"></div>
          <span className="text-gray-400">Köp (bid)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500"></div>
          <span className="text-gray-400">Sälj (ask)</span>
        </div>
      </div>
      <p className="text-gray-500 text-xs mt-3 text-center">
        {timeRange === "10s" || timeRange === "30s" || timeRange === "1m"
          ? `⚡ För korta intervall visas simulerad data med ${(SPREAD * 100).toFixed(2)}% spread.`
          : `📈 Realtidspriser från Binance med ${(SPREAD * 100).toFixed(2)}% spread – uppdateras var 10:e sekund.`}
      </p>
    </div>
  );
};

export default SimpleRealtimeChart;
