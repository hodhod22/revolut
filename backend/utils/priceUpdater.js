const fs = require("fs");
const path = require("path");
const axios = require("axios");

const pricesFilePath = path.join(__dirname, "../fictionalPrices.json");

function loadPrices() {
  const data = fs.readFileSync(pricesFilePath, "utf8");
  return JSON.parse(data);
}

function savePrices(prices) {
  fs.writeFileSync(pricesFilePath, JSON.stringify(prices, null, 2));
}

async function fetchBitcoinPrice() {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      { timeout: 5000 },
    );
    const priceUsd = parseFloat(response.data.price);
    return priceUsd * 10.5;
  } catch (error) {
    console.error("Kunde inte hämta Bitcoinpris:", error.message);
    return null;
  }
}

// Tilldela unika offsets slumpmässigt till varje coin
function assignDailyOffsets(prices) {
  const offsets = [...prices.availableOffsets];
  // Slumpa ordningen
  for (let i = offsets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
  }
  const coinIds = Object.keys(prices.coins);
  coinIds.forEach((coinId, idx) => {
    prices.coins[coinId].offset = offsets[idx];
  });
  prices.dailyOffsetsAssigned = true;
  console.log(
    "Nya dagliga offsets tilldelade:",
    coinIds.map((id) => `${id}: ${prices.coins[id].offset}%`).join(", "),
  );
}

// Uppdatera referenspriset (Bitcoinpris vid 23:00)
async function updateReferencePrice() {
  const prices = loadPrices();
  const newBtc = await fetchBitcoinPrice();
  if (newBtc) {
    prices.referenceBtcPrice = newBtc;
    prices.dailyOffsetsAssigned = false; // tvingar ny offset-tilldelning nästa gång
    savePrices(prices);
    console.log(`Referenspris uppdaterat till ${newBtc.toFixed(2)} SEK`);
  }
}

// Initiera vid start: sätt referenspris och tilldela offsets om de saknas
async function initScheduler() {
  const prices = loadPrices();
  let changed = false;
  if (!prices.referenceBtcPrice) {
    const btc = await fetchBitcoinPrice();
    if (btc) {
      prices.referenceBtcPrice = btc;
      changed = true;
      console.log(`Initialt referenspris satt till ${btc.toFixed(2)} SEK`);
    }
  }
  if (
    !prices.dailyOffsetsAssigned ||
    Object.values(prices.coins).some((c) => c.offset === null)
  ) {
    assignDailyOffsets(prices);
    changed = true;
  }
  if (changed) savePrices(prices);
}

// Daglig reset kl 23:00 svensk tid
function startDailyReset() {
  setInterval(async () => {
    const now = new Date();
    const swedenNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }),
    );
    if (swedenNow.getHours() === 23 && swedenNow.getMinutes() === 0) {
      console.log("Kör daglig reset (23:00)...");
      await updateReferencePrice();
      const prices = loadPrices();
      assignDailyOffsets(prices);
      savePrices(prices);
    }
  }, 60000); // kolla varje minut
}

// Starta allt
function startScheduler() {
  initScheduler();
  startDailyReset();
  console.log(
    "Schemaläggare aktiv: daglig reset kl 23:00, offsets slumpas dagligen.",
  );
}

module.exports = {
  loadPrices,
  updateReferencePrice,
  assignDailyOffsets,
  startScheduler,
};
