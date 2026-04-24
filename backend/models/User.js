const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 100000 },
    portfolio: [
      {
        coinId: String,
        amount: Number, // Kan vara negativt (short position)
        buyPrice: Number, // Genomsnittligt pris för long, för short kan det vara negativt eller noll
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
