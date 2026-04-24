const express = require("express");
const axios = require("axios");
const router = express.Router();
const CustomToken = require("../models/CustomToken"); // ny rad

// Mappning för Binance-symboler (oförändrad)
function getBinanceSymbol(coinId) {
  const map = {
    bitcoin: "BTCUSDT",
    btc: "BTCUSDT",
    ethereum: "ETHUSDT",
    eth: "ETHUSDT",
    solana: "SOLUSDT",
    sol: "SOLUSDT",
    cardano: "ADAUSDT",
    ada: "ADAUSDT",
    ripple: "XRPUSDT",
    xrp: "XRPUSDT",
    dogecoin: "DOGEUSDT",
    doge: "DOGEUSDT",
    polkadot: "DOTUSDT",
    dot: "DOTUSDT",
    litecoin: "LTCUSDT",
    ltc: "LTCUSDT",
    chainlink: "LINKUSDT",
    link: "LINKUSDT",
    avalanche: "AVAXUSDT",
    avax: "AVAXUSDT",
    polygon: "MATICUSDT",
    matic: "MATICUSDT",
    shiba: "SHIBUSDT",
    shib: "SHIBUSDT",
    stellar: "XLMUSDT",
    xlm: "XLMUSDT",
    uniswap: "UNIUSDT",
    uni: "UNIUSDT",
  };
  return map[coinId.toLowerCase()];
}

// Hämta historiska priser (oförändrad – fungerar bara för riktiga coins)
router.get("/history/:coinId", async (req, res) => {
  const { minutes, hours, days } = req.query;
  const coinId = req.params.coinId.toLowerCase();
  const symbol = getBinanceSymbol(coinId);
  if (!symbol) return res.status(400).json({ error: "Okänd coin" });

  let interval = "1h";
  let limit = 168;
  if (minutes) {
    const mins = parseInt(minutes);
    if (mins <= 60) {
      interval = "1m";
      limit = mins;
    } else if (mins <= 300) {
      interval = "5m";
      limit = Math.ceil(mins / 5);
    } else if (mins <= 720) {
      interval = "15m";
      limit = Math.ceil(mins / 15);
    } else if (mins <= 1440) {
      interval = "30m";
      limit = Math.ceil(mins / 30);
    } else {
      interval = "1h";
      limit = Math.ceil(mins / 60);
    }
  } else if (hours) {
    const hrs = parseInt(hours);
    if (hrs <= 24) {
      interval = "1h";
      limit = hrs;
    } else if (hrs <= 168) {
      interval = "4h";
      limit = Math.ceil(hrs / 4);
    } else {
      interval = "1d";
      limit = Math.ceil(hrs / 24);
    }
  } else if (days) {
    const dys = parseInt(days);
    if (dys <= 7) {
      interval = "1h";
      limit = dys * 24;
    } else if (dys <= 30) {
      interval = "4h";
      limit = dys * 6;
    } else if (dys <= 90) {
      interval = "1d";
      limit = dys;
    } else {
      interval = "1w";
      limit = Math.min(Math.ceil(dys / 7), 52);
    }
  }
  limit = Math.min(limit, 1000);
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await axios.get(url, { timeout: 10000 });
    const prices = response.data.map((candle) => ({
      timestamp: candle[0],
      price: parseFloat(candle[4]) * 10.5,
      open: parseFloat(candle[1]) * 10.5,
      high: parseFloat(candle[2]) * 10.5,
      low: parseFloat(candle[3]) * 10.5,
      close: parseFloat(candle[4]) * 10.5,
    }));
    res.json(prices);
  } catch (err) {
    console.error("Binance error:", err.message);
    res.status(500).json({ error: "Kunde inte hämta historik" });
  }
});

// Hämta endast riktiga kryptovalutor (Binance)
router.get("/market", async (req, res) => {
  const coinList = [
    "bitcoin",
    "ethereum",
    "solana",
    "cardano",
    "ripple",
    "dogecoin",
    "polkadot",
    "litecoin",
    "chainlink",
    "avalanche",
    "polygon",
    "shiba",
    "stellar",
    "uniswap",
  ];
  try {
    const results = await Promise.all(
      coinList.map(async (id) => {
        const symbol = getBinanceSymbol(id);
        if (!symbol) return null;
        const ticker = await axios.get(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
        );
        const data = ticker.data;
        return {
          id,
          symbol: id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          current_price: parseFloat(data.lastPrice) * 10.5,
          bid_price: parseFloat(data.bidPrice) * 10.5,
          ask_price: parseFloat(data.askPrice) * 10.5,
          price_change_percentage_24h: parseFloat(data.priceChangePercent),
          image: `https://assets.coingecko.com/coins/images/1/small/${id}.png`,
          isCustom: false,
        };
      }),
    );
    res.json(results.filter((r) => r !== null));
  } catch (err) {
    console.error("Market error:", err);
    res.status(500).json([]);
  }
});

// Ny route: Hämta alla custom tokens (från Token Factory)
router.get("/custom-tokens", async (req, res) => {
  try {
    const tokens = await CustomToken.find({});
    const formatted = tokens.map((t) => ({
      id: t.symbol.toLowerCase(),
      symbol: t.symbol.toLowerCase(),
      name: t.name,
      current_price: t.defaultPrice,
      bid_price: t.defaultPrice,
      ask_price: t.defaultPrice,
      price_change_percentage_24h: 0,
      image: `https://placehold.co/32x32/cyan/white?text=${t.symbol.charAt(0)}`,
      isCustom: true,
    }));
    res.json(formatted);
  } catch (err) {
    console.error("Custom tokens error:", err);
    res.status(500).json([]);
  }
});

// Valfritt: Kombinerad endpoint (både riktiga och custom)
router.get("/all-markets", async (req, res) => {
  try {
    const [real, custom] = await Promise.all([
      fetchRealMarkets(), // vi måste göra en intern funktion
      CustomToken.find({}),
    ]);
    const realData = real; // från din /market-logik
    const customData = custom.map((t) => ({
      id: t.symbol.toLowerCase(),
      symbol: t.symbol.toLowerCase(),
      name: t.name,
      current_price: t.defaultPrice,
      bid_price: t.defaultPrice,
      ask_price: t.defaultPrice,
      price_change_percentage_24h: 0,
      image: `https://placehold.co/32x32/cyan/white?text=${t.symbol.charAt(0)}`,
      isCustom: true,
    }));
    res.json([...realData, ...customData]);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Hjälpfunktion för att hämta riktiga marknadsdata (för användning i /all-markets)
async function fetchRealMarkets() {
  const coinList = [
    "bitcoin",
    "ethereum",
    "solana",
    "cardano",
    "ripple",
    "dogecoin",
    "polkadot",
    "litecoin",
    "chainlink",
    "avalanche",
    "polygon",
    "shiba",
    "stellar",
    "uniswap",
  ];
  const results = await Promise.all(
    coinList.map(async (id) => {
      const symbol = getBinanceSymbol(id);
      if (!symbol) return null;
      const ticker = await axios.get(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
      );
      const data = ticker.data;
      return {
        id,
        symbol: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        current_price: parseFloat(data.lastPrice) * 10.5,
        bid_price: parseFloat(data.bidPrice) * 10.5,
        ask_price: parseFloat(data.askPrice) * 10.5,
        price_change_percentage_24h: parseFloat(data.priceChangePercent),
        image: `https://assets.coingecko.com/coins/images/1/small/${id}.png`,
        isCustom: false,
      };
    }),
  );
  return results.filter((r) => r !== null);
}

module.exports = router;
