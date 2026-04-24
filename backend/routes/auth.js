const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

// Registrering
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "Användaren finns redan" });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    user = new User({ name, email, password: hashed });
    await user.save();
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: { id: user.id, name, email, balance: user.balance },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inloggning
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Användaren finns inte" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Fel lösenord" });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email,
        balance: user.balance,
        portfolio: user.portfolio,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hämta användardata
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 Tillfällig route för att sätta testbalans (100 000 SEK)
router.post("/set-balance", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: "Användare ej funnen" });
    user.balance = 100000;
    await user.save();
    res.json({ balance: user.balance });
  } catch (err) {
    console.error("Set balance error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
