import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import cryptoReducer from "../features/crypto/cryptoSlice";
import portfolioReducer from "../features/portfolio/portfolioSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    crypto: cryptoReducer,
    portfolio: portfolioReducer,
  },
});
