import { useEffect, useState } from "react";
import axios from "axios";

export const useRealtimePrice = (coinId) => {
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!coinId) return;
    let ws = null;
    let reconnectTimer = null;
    let pollingInterval = null;

    const startPolling = async () => {
      const fetchData = async () => {
        try {
          const res = await axios.get(
            `/api/crypto/history/${coinId}?seconds=10`,
          );
          const points = res.data.map((p) => ({
            timestamp: p.timestamp,
            price: p.price,
          }));
          if (points.length) {
            setLatestPrice(points[points.length - 1].price);
            setPriceHistory((prev) =>
              [...prev.slice(-199), ...points].slice(-200),
            );
          }
        } catch (err) {}
      };
      await fetchData();
      pollingInterval = setInterval(fetchData, 5000);
    };

    const connect = () => {
      try {
        ws = new WebSocket("ws://localhost:5000");
        ws.onopen = () => {
          if (pollingInterval) clearInterval(pollingInterval);
          ws.send(JSON.stringify({ type: "subscribe", coinId }));
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "priceUpdate" && data.coinId === coinId) {
              setLatestPrice(data.price);
              setPriceHistory((prev) => [
                ...prev.slice(-199),
                { timestamp: data.timestamp, price: data.price },
              ]);
            }
          } catch (err) {}
        };
        ws.onerror = () => {
          startPolling();
        };
        ws.onclose = () => {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => connect(), 3000);
        };
      } catch (err) {
        startPolling();
      }
    };

    connect();
    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [coinId]);

  return { latestPrice, priceHistory, error };
};
