require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const { startScheduler } = require("./utils/priceUpdater");
const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const cryptoRoutes = require("./routes/crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/crypto", cryptoRoutes);

// WebSocket: strömma trades från Binance till alla klienter
const clients = new Set();
const binanceStreams = new Map();

function startBinanceStream(symbol, coinId) {
  if (binanceStreams.has(symbol)) return;
  const binanceWs = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol}@trade`,
  );
  binanceStreams.set(symbol, binanceWs);
  binanceWs.on("message", (data) => {
    try {
      const trade = JSON.parse(data);
      const price = parseFloat(trade.p) * 10.5; // USD -> SEK
      const msg = JSON.stringify({
        type: "trade",
        coinId: coinId,
        price: price,
        timestamp: trade.T,
      });
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
      });
    } catch (err) {}
  });
  binanceWs.on("error", (err) =>
    console.error(`Binance ${symbol} error:`, err.message),
  );
  binanceWs.on("close", () => binanceStreams.delete(symbol));
}

wss.on("connection", (ws) => {
  clients.add(ws);
  const coins = [
    { id: "bitcoin", symbol: "btcusdt" },
    { id: "ethereum", symbol: "ethusdt" },
    { id: "solana", symbol: "solusdt" },
    { id: "cardano", symbol: "adausdt" },
    { id: "ripple", symbol: "xrpusdt" },
  ];
  coins.forEach((c) => startBinanceStream(c.symbol, c.id));
  ws.on("close", () => clients.delete(ws));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


// ... efter att servern lyssnar
startScheduler();
