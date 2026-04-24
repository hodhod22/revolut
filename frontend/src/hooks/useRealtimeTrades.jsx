import { useEffect, useState } from "react";

export const useRealtimeTrades = (coinId) => {
  const [bidHistory, setBidHistory] = useState([]);
  const [askHistory, setAskHistory] = useState([]);
  const [lastBid, setLastBid] = useState(null);
  const [lastAsk, setLastAsk] = useState(null);

  useEffect(() => {
    if (!coinId) return;
    let ws = null;
    let reconnectTimer = null;

    const connect = () => {
      ws = new WebSocket("ws://localhost:5000");
      ws.onopen = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "trade" && data.coinId === coinId) {
            const midPrice = data.price;
            const spread = 0.001; // 0.1% spread
            const bid = midPrice * (1 - spread);
            const ask = midPrice * (1 + spread);
            setLastBid(bid);
            setLastAsk(ask);
            setBidHistory((prev) => [
              ...prev.slice(-999),
              { timestamp: data.timestamp, price: bid },
            ]);
            setAskHistory((prev) => [
              ...prev.slice(-999),
              { timestamp: data.timestamp, price: ask },
            ]);
          }
        } catch (err) {}
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {};
    };
    connect();
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [coinId]);

  return { bidHistory, askHistory, lastBid, lastAsk };
};
