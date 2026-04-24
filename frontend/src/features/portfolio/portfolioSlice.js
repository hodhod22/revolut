// frontend/src/features/portfolio/portfolioSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "/api/transactions";

// Hämta användarens portfölj (Dashboard & Portfolio)
export const fetchPortfolio = createAsyncThunk(
  "portfolio/fetchPortfolio",
  async (_, { getState }) => {
    const token = getState().auth.token;
    const res = await axios.get("/api/auth/me", {
      headers: { "x-auth-token": token },
    });
    return { balance: res.data.balance, portfolio: res.data.portfolio };
  },
);

// Köp baserat på antal (används av Portfolio)
export const buyCrypto = createAsyncThunk(
  "portfolio/buyCrypto",
  async ({ coinId, amount }, { getState }) => {
    const token = getState().auth.token;
    const res = await axios.post(
      `${API_URL}/buy`,
      { coinId, amount },
      {
        headers: { "x-auth-token": token },
      },
    );
    return res.data;
  },
);

// Sälj baserat på antal (används av Portfolio)
export const sellCrypto = createAsyncThunk(
  "portfolio/sellCrypto",
  async ({ coinId, amount }, { getState }) => {
    const token = getState().auth.token;
    const res = await axios.post(
      `${API_URL}/sell`,
      { coinId, amount },
      {
        headers: { "x-auth-token": token },
      },
    );
    return res.data;
  },
);

// Köp baserat på SEK-belopp (används av Markets)
export const buyWithAmount = createAsyncThunk(
  "portfolio/buyWithAmount",
  async ({ coinId, amountSEK }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const coin = getState().crypto.coins.find((c) => c.id === coinId);
      if (!coin) throw new Error("Coin not found");
      const price = coin.ask_price;
      if (amountSEK < 300) throw new Error("Minsta köpbelopp är 300 SEK");
      const calculatedAmount = amountSEK / price;
      if (calculatedAmount < 0.0001) {
        throw new Error(
          `Beloppet ${amountSEK} SEK är för litet för ${coinId}. Minsta köp är ${(0.0001 * price).toFixed(2)} SEK.`,
        );
      }
      const res = await axios.post(
        `${API_URL}/buy`,
        { coinId, amount: calculatedAmount },
        {
          headers: { "x-auth-token": token },
        },
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || err.message);
    }
  },
);

// Sälj baserat på SEK-belopp (används av Markets)
export const sellWithAmount = createAsyncThunk(
  "portfolio/sellWithAmount",
  async ({ coinId, amountSEK }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const coin = getState().crypto.coins.find((c) => c.id === coinId);
      if (!coin) throw new Error("Coin not found");
      const price = coin.bid_price;
      if (amountSEK < 300) throw new Error("Minsta säljbelopp är 300 SEK");
      const calculatedAmount = amountSEK / price;
      if (calculatedAmount < 0.0001) {
        throw new Error(
          `Beloppet ${amountSEK} SEK är för litet för ${coinId}. Minsta sälj är ${(0.0001 * price).toFixed(2)} SEK.`,
        );
      }
      const res = await axios.post(
        `${API_URL}/sell`,
        { coinId, amount: calculatedAmount },
        {
          headers: { "x-auth-token": token },
        },
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || err.message);
    }
  },
);

// Short (sälj utan ägo) – används av Markets
export const shortCrypto = createAsyncThunk(
  "portfolio/shortCrypto",
  async ({ coinId, amountSEK }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await axios.post(
        `${API_URL}/short`,
        { coinId, amountSEK },
        {
          headers: { "x-auth-token": token },
        },
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || err.message);
    }
  },
);

// Sälj hela innehavet av en specifik kryptovaluta (används av Portfolio)
export const sellAllOfCoin = createAsyncThunk(
  "portfolio/sellAllOfCoin",
  async ({ coinId }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const portfolio = getState().portfolio.portfolio;
      const ownedCoin = portfolio.find((p) => p.coinId === coinId);
      if (!ownedCoin || ownedCoin.amount === 0) {
        return rejectWithValue(`Du äger inga ${coinId}`);
      }
      const res = await axios.post(
        `${API_URL}/sell`,
        { coinId, amount: ownedCoin.amount },
        {
          headers: { "x-auth-token": token },
        },
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || err.message);
    }
  },
);

// Sälj hela portföljen (alla innehav) – används av Portfolio
export const sellAllPortfolio = createAsyncThunk(
  "portfolio/sellAllPortfolio",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const portfolio = getState().portfolio.portfolio;
      if (portfolio.length === 0) {
        return rejectWithValue("Du har inga innehav att sälja");
      }
      for (const item of portfolio) {
        await axios.post(
          `${API_URL}/sell`,
          { coinId: item.coinId, amount: item.amount },
          {
            headers: { "x-auth-token": token },
          },
        );
      }
      const me = await axios.get("/api/auth/me", {
        headers: { "x-auth-token": token },
      });
      return { balance: me.data.balance, portfolio: me.data.portfolio };
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || err.message);
    }
  },
);

// Hämta transaktionshistorik (används av Portfolio)
export const fetchHistory = createAsyncThunk(
  "portfolio/history",
  async (_, { getState }) => {
    const token = getState().auth.token;
    const res = await axios.get(`${API_URL}/history`, {
      headers: { "x-auth-token": token },
    });
    return res.data;
  },
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState: {
    balance: 0,
    portfolio: [],
    transactions: [],
    loading: false,
    error: null,
  },
  reducers: {
    resetPortfolio: (state) => {
      state.balance = 0;
      state.portfolio = [];
      state.transactions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(buyCrypto.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(sellCrypto.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(buyWithAmount.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(sellWithAmount.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(shortCrypto.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(sellAllOfCoin.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(sellAllPortfolio.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.portfolio = action.payload.portfolio;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.transactions = action.payload;
      });
  },
});

export const { resetPortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
