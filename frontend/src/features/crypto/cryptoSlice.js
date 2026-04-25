import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Hämta både riktiga och custom tokens
export const fetchCryptoMarket = createAsyncThunk(
  "crypto/fetchCryptoMarket",
  async (_, { rejectWithValue }) => {
    try {
      // Anropa båda endpoints – om custom-tokens misslyckas, använd tom array
      const [realRes, customRes] = await Promise.all([
        axios.get("/api/crypto/market"),
        axios.get("/api/crypto/custom-tokens").catch(() => ({ data: [] })),
      ]);

      // Säkerställ att vi har arrays
      const realCoins = Array.isArray(realRes.data) ? realRes.data : [];
      const customCoins = Array.isArray(customRes.data) ? customRes.data : [];

      return [...realCoins, ...customCoins];
    } catch (error) {
      console.error("fetchCryptoMarket fel:", error);
      return rejectWithValue(error.message);
    }
  },
);

// Uppdatera endast priser (live) – för riktiga coins, custom tokens har statiska priser
export const updatePricesOnly = createAsyncThunk(
  "crypto/updatePricesOnly",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await axios.get("/api/crypto/market");
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("updatePricesOnly fel:", error);
      return rejectWithValue(error.message);
    }
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
        state.error = null;
      })
      .addCase(fetchCryptoMarket.fulfilled, (state, action) => {
        state.loading = false;
        state.coins = action.payload;
        state.error = null;
      })
      .addCase(fetchCryptoMarket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Kunde inte hämta marknadsdata";
        console.error("fetchCryptoMarket rejected:", action.payload);
      })
      .addCase(updatePricesOnly.pending, (state) => {
        // Ingen loading-indikator för bakgrundsuppdatering
      })
      .addCase(updatePricesOnly.fulfilled, (state, action) => {
        // Uppdatera endast de riktiga coinsen (custom tokens ändras inte)
        const realCoins = action.payload;
        const customCoins = state.coins.filter((c) => c.isCustom === true);
        state.coins = [...realCoins, ...customCoins];
      })
      .addCase(updatePricesOnly.rejected, (state, action) => {
        console.error("updatePricesOnly rejected:", action.payload);
        // Vi sätter inget error-state här för att inte störa användaren
      });
  },
});

export default cryptoSlice.reducer;
