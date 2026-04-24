import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  updateMarketPrice,
  fetchCryptoMarket,
} from "../features/crypto/cryptoSlice";

export const useRealtimeMarkets = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let pollingInterval = null;
    let wsFailed = false;

    const startPolling = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = setInterval(() => {
        dispatch(fetchCryptoMarket());
      }, 5000);
    };

    const connect = () => {
      try {
        ws = new WebSocket("ws://localhost:5000");
        ws.onopen = () => {
          // WebSocket fungerar, använd den istället för polling
          if (pollingInterval) clearInterval(pollingInterval);
          wsFailed = false;
          // Prenumerera på alla mynt
          const coins = ["bitcoin", "ethereum", "solana", "cardano", "ripple"];
          coins.forEach((coinId) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "subscribe", coinId }));
            }
          });
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "priceUpdate") {
              const symbolMap = {
                bitcoin: "btcusdt",
                ethereum: "ethusdt",
                solana: "solusdt",
                cardano: "adausdt",
                ripple: "xrpusdt",
              };
              const symbol = symbolMap[data.coinId];
              if (symbol) {
                dispatch(updateMarketPrice({ symbol, price: data.price }));
              }
            }
          } catch (err) {}
        };
        ws.onerror = () => {
          if (!wsFailed) {
            wsFailed = true;
            startPolling();
          }
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
  }, [dispatch]);
};
