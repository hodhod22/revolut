import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "/api/auth";

export const register = createAsyncThunk(
  "auth/register",
  async ({ name, email, password }) => {
    const res = await axios.post(`${API_URL}/register`, {
      name,
      email,
      password,
    });
    if (res.data.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },
);

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }) => {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res.data;
  },
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { getState }) => {
    const token = getState().auth.token;
    const res = await axios.get(`${API_URL}/me`, {
      headers: { "x-auth-token": token },
    });
    return res.data;
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token"),
    isLoading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
