const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  coinId: String,
  type: { type: String, enum: ["buy", "sell", "short"] }, // lägg till 'short'
  amount: Number,
  price: Number,
  total: Number,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
