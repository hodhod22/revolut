// frontend/src/hooks/useLivePrice.js
import { useEffect, useState } from "react";

export const useLivePrice = (coinId) => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    if (!coinId) return;
    const ws = new WebSocket("ws://localhost:5000");
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", coinId }));
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "priceUpdate") {
        setPrice(data.price);
      }
    };
    return () => ws.close();
  }, [coinId]);

  return price;
};
