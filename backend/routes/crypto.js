const express = require("express");
const axios = require("axios");
const router = express.Router();
const CustomToken = require("../models/CustomToken");

// Mappning för Binance-symboler
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
    polygon: "MATICUSDT", // endast polygon
    shiba: "SHIBUSDT",
    shib: "SHIBUSDT",
    stellar: "XLMUSDT",
    xlm: "XLMUSDT",
    uniswap: "UNIUSDT",
    uni: "UNIUSDT",
  };
  return map[coinId.toLowerCase()];
}

// Hämta historiska priser (riktiga + custom)
router.get("/history/:coinId", async (req, res) => {
  const { minutes, hours, days } = req.query;
  const coinId = req.params.coinId.toLowerCase();
  const symbol = getBinanceSymbol(coinId);

  if (symbol) {
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
      return res.json(prices);
    } catch (err) {
      console.error(`Binance error för ${symbol}:`, err.message);
      return res.status(500).json({ error: "Kunde inte hämta historik" });
    }
  }

  // Custom tokens (mockhistorik)
  try {
    const token = await CustomToken.findOne({ symbol: coinId.toUpperCase() });
    if (!token) {
      return res.status(404).json({ error: `Token ${coinId} finns inte` });
    }
    let points = 100;
    if (minutes) points = Math.min(parseInt(minutes), 1440);
    else if (hours) points = Math.min(parseInt(hours) * 60, 1440);
    else if (days) points = Math.min(parseInt(days) * 1440, 1000);
    const basePrice = token.defaultPrice;
    const now = Date.now();
    const stepMs = (points * 60000) / points;
    const mockPrices = [];
    for (let i = points; i >= 0; i--) {
      const timestamp = now - i * stepMs;
      const variation = 1 + (Math.random() - 0.5) * 0.01;
      const price = basePrice * variation;
      mockPrices.push({
        timestamp,
        price,
        open: price,
        high: price * 1.005,
        low: price * 0.995,
        close: price,
      });
    }
    res.json(mockPrices);
  } catch (err) {
    console.error("Custom token history error:", err);
    res
      .status(500)
      .json({ error: "Kunde inte hämta historik för custom token" });
  }
});

// Hämta marknadsdata (riktiga coins) – utan dubbletter
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
        try {
          const ticker = await axios.get(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
            { timeout: 5000 },
          );
          const data = ticker.data;
          let price = parseFloat(data.lastPrice) * 10.5;
          if (isNaN(price) || price === 0) {
            price =
              parseFloat(data.askPrice) * 10.5 ||
              parseFloat(data.bidPrice) * 10.5 ||
              1;
          }
          return {
            id,
            symbol: id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            current_price: price,
            bid_price: parseFloat(data.bidPrice) * 10.5,
            ask_price: parseFloat(data.askPrice) * 10.5,
            price_change_percentage_24h: parseFloat(data.priceChangePercent),
            image: `https://assets.coingecko.com/coins/images/1/small/${id}.png`,
            isCustom: false,
          };
        } catch (err) {
          console.error(`Fel vid hämtning av ${symbol}:`, err.message);
          return null;
        }
      }),
    );
    const filtered = results.filter((r) => r !== null);
    res.json(filtered);
  } catch (err) {
    console.error("Market error:", err);
    res.status(500).json([]);
  }
});

// Hämta custom tokens (från Token Factory)
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

// Kombinerad endpoint (valfritt)
router.get("/all-markets", async (req, res) => {
  try {
    const [real, custom] = await Promise.all([
      fetchRealMarkets(),
      CustomToken.find({}),
    ]);
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
    res.json([...real, ...customData]);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Hjälpfunktion för riktiga marknader (används i /all-markets)
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
      try {
        const ticker = await axios.get(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
          { timeout: 5000 },
        );
        const data = ticker.data;
        let price = parseFloat(data.lastPrice) * 10.5;
        if (isNaN(price) || price === 0) {
          price =
            parseFloat(data.askPrice) * 10.5 ||
            parseFloat(data.bidPrice) * 10.5 ||
            1;
        }
        return {
          id,
          symbol: id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          current_price: price,
          bid_price: parseFloat(data.bidPrice) * 10.5,
          ask_price: parseFloat(data.askPrice) * 10.5,
          price_change_percentage_24h: parseFloat(data.priceChangePercent),
          image: `https://assets.coingecko.com/coins/images/1/small/${id}.png`,
          isCustom: false,
        };
      } catch (err) {
        return null;
      }
    }),
  );
  return results.filter((r) => r !== null);
}

module.exports = router;
