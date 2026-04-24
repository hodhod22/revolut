const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const CustomToken = require("../models/CustomToken"); // ny import
const router = express.Router();

// Hjälpfunktion för att hämta aktuellt pris i SEK
async function getPrice(coinId) {
  // 1. Försök med riktiga Binance-coins
  const symbolMap = {
    bitcoin: "BTCUSDT",
    ethereum: "ETHUSDT",
    solana: "SOLUSDT",
    cardano: "ADAUSDT",
    ripple: "XRPUSDT",
  };
  const symbol = symbolMap[coinId];
  if (symbol) {
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      );
      const priceUsd = parseFloat(response.data.price);
      return priceUsd * 10.5; // USD till SEK
    } catch (err) {
      console.error(`Binance error för ${coinId}:`, err.message);
      // Fallback till nästa steg om Binance misslyckas
    }
  }

  // 2. Kolla om det är en custom token från Token Factory
  try {
    const customToken = await CustomToken.findOne({
      symbol: coinId.toUpperCase(),
    });
    if (customToken) {
      return customToken.defaultPrice;
    }
  } catch (err) {
    console.error("Fel vid uppslag av custom token:", err.message);
  }

  // 3. Fallback till de gamla fiktiva coinsen
  const fictionalPrices = {
    valoria: 50,
    nexcoin: 20,
    aurista: 10,
    veritus: 4,
    unifyx: 2,
    solviro: 1,
    fidexus: 0.4,
    optivus: 0.2,
    luminar: 0.1,
    cryptos: 0.01,
  };
  return fictionalPrices[coinId] || 1;
}

// Köp (long) – uppdaterad för att ta emot antingen amount (antal) eller amountSEK (belopp)
router.post("/buy", auth, async (req, res) => {
  try {
    let { coinId, amount, amountSEK } = req.body;
    const price = await getPrice(coinId);
    let totalCost, coinsToBuy;

    if (amountSEK !== undefined && amountSEK > 0) {
      // Ny version: användaren anger SEK-belopp
      totalCost = amountSEK;
      coinsToBuy = totalCost / price;
    } else if (amount !== undefined && amount > 0) {
      // Gammal version: användaren anger antal mynt
      totalCost = price * amount;
      coinsToBuy = amount;
    } else {
      return res
        .status(400)
        .json({ msg: "Antal (amount) eller belopp (amountSEK) måste anges" });
    }

    const user = await User.findById(req.user);
    if (user.balance < totalCost) {
      return res
        .status(400)
        .json({
          msg: `Otillräckligt saldo. Behöver ${totalCost} SEK, har ${user.balance} SEK.`,
        });
    }

    const index = user.portfolio.findIndex((p) => p.coinId === coinId);
    if (index === -1) {
      user.portfolio.push({ coinId, amount: coinsToBuy, buyPrice: price });
    } else {
      const oldTotal =
        user.portfolio[index].amount * user.portfolio[index].buyPrice;
      const newTotal = oldTotal + totalCost;
      const newAmount = user.portfolio[index].amount + coinsToBuy;
      user.portfolio[index].buyPrice = newTotal / newAmount;
      user.portfolio[index].amount = newAmount;
    }
    user.balance -= totalCost;
    await user.save();

    const transaction = new Transaction({
      userId: user.id,
      coinId,
      type: "buy",
      amount: coinsToBuy,
      price,
      total: totalCost,
    });
    await transaction.save();

    res.json({ balance: user.balance, portfolio: user.portfolio });
  } catch (err) {
    console.error("Köp-fel:", err);
    res.status(500).json({ error: err.message });
  }
});

// Sälj (stäng long eller minska short-negativ) – oförändrad, men använder samma getPrice
router.post("/sell", auth, async (req, res) => {
  try {
    const { coinId, amount } = req.body;
    const price = await getPrice(coinId);
    const totalRevenue = price * amount;

    const user = await User.findById(req.user);
    const portfolioItem = user.portfolio.find((p) => p.coinId === coinId);
    if (!portfolioItem) {
      return res.status(400).json({ msg: `Du har ingen position i ${coinId}` });
    }
    if (Math.abs(portfolioItem.amount) < amount) {
      return res
        .status(400)
        .json({
          msg: `Du har inte så många mynt att sälja (innehav: ${portfolioItem.amount})`,
        });
    }

    portfolioItem.amount -= amount;
    if (portfolioItem.amount === 0) {
      user.portfolio = user.portfolio.filter((p) => p.coinId !== coinId);
    }
    user.balance += totalRevenue;
    await user.save();

    const transaction = new Transaction({
      userId: user.id,
      coinId,
      type: "sell",
      amount,
      price,
      total: totalRevenue,
    });
    await transaction.save();

    res.json({ balance: user.balance, portfolio: user.portfolio });
  } catch (err) {
    console.error("Säljfel:", err);
    res.status(500).json({ error: err.message });
  }
});

// Short (sälj utan att äga, skapar negativ position) – oförändrad
router.post("/short", auth, async (req, res) => {
  try {
    const { coinId, amountSEK } = req.body;
    const price = await getPrice(coinId);
    const amountCoins = amountSEK / price;

    const user = await User.findById(req.user);
    const index = user.portfolio.findIndex((p) => p.coinId === coinId);
    if (index === -1) {
      user.portfolio.push({ coinId, amount: -amountCoins, buyPrice: price });
    } else {
      user.portfolio[index].amount -= amountCoins;
    }
    user.balance += amountSEK;
    await user.save();

    const transaction = new Transaction({
      userId: user.id,
      coinId,
      type: "short",
      amount: amountCoins,
      price,
      total: amountSEK,
    });
    await transaction.save();

    res.json({ balance: user.balance, portfolio: user.portfolio });
  } catch (err) {
    console.error("Shortfel:", err);
    res.status(500).json({ error: err.message });
  }
});

// Hämta transaktionshistorik (inkl short)
router.get("/history", auth, async (req, res) => {
  try {
    const txs = await Transaction.find({ userId: req.user }).sort({ date: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
