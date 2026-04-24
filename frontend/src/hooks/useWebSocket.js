import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const useWebSocket = (coinId) => {
  const [socket, setSocket] = useState(null);
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const historyRef = useRef([]); // för att kunna komma åt senaste värden i filter

  useEffect(() => {
    if (!coinId) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("WebSocket ansluten, prenumererar på", coinId);
      newSocket.emit("subscribe", coinId);
    });

    newSocket.on("priceUpdate", (data) => {
      if (data.coinId === coinId) {
        setLatestPrice(data.price);
        const newPoint = { timestamp: data.timestamp, price: data.price };
        historyRef.current = [...historyRef.current, newPoint].slice(-10000); // spara max 10000 punkter
        setPriceHistory(historyRef.current);
      }
    });

    return () => {
      if (newSocket) {
        newSocket.emit("unsubscribe");
        newSocket.disconnect();
      }
      historyRef.current = [];
    };
  }, [coinId]);

  // Funktion för att filtrera historik baserat på tidsintervall (sekunder, minuter, timmar)
  const getHistoryForTimeRange = (rangeConfig) => {
    const now = Date.now();
    let startTime = now;
    if (rangeConfig.seconds) startTime = now - rangeConfig.seconds * 1000;
    else if (rangeConfig.minutes)
      startTime = now - rangeConfig.minutes * 60 * 1000;
    else if (rangeConfig.hours)
      startTime = now - rangeConfig.hours * 60 * 60 * 1000;
    else return [];

    return historyRef.current.filter((point) => point.timestamp >= startTime);
  };

  return { latestPrice, priceHistory, getHistoryForTimeRange };
};
