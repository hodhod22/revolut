import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Hämta både riktiga och custom tokens
export const fetchCryptoMarket = createAsyncThunk(
  "crypto/fetchCryptoMarket",
  async () => {
    const [realRes, customRes] = await Promise.all([
      axios.get("/api/crypto/market"),
      axios.get("/api/crypto/custom-tokens"),
    ]);
    return [...realRes.data, ...customRes.data];
  },
);

// Uppdatera endast priser (live) – för riktiga coins, custom tokens har statiska priser
export const updatePricesOnly = createAsyncThunk(
  "crypto/updatePricesOnly",
  async () => {
    const res = await axios.get("/api/crypto/market");
    return res.data;
  },
);

const cryptoSlice = createSlice({
  name: "crypto",
  initialState: {
    coins: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCryptoMarket.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCryptoMarket.fulfilled, (state, action) => {
        state.loading = false;
        state.coins = action.payload;
      })
      .addCase(fetchCryptoMarket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updatePricesOnly.fulfilled, (state, action) => {
        // Uppdatera endast de riktiga coinsen (custom tokens ändras inte)
        const realCoins = action.payload;
        const customCoins = state.coins.filter((c) => c.isCustom === true);
        state.coins = [...realCoins, ...customCoins];
      });
  },
});

export default cryptoSlice.reducer;
