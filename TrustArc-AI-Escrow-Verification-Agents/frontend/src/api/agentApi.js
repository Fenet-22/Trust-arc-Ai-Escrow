// API service for AI verification endpoints
import axios from "axios";

// Backend API URL from environment variables, fallback to local development
const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:3001";

// Submit task for AI verification and fund release
export const verifyAndRelease = (data) =>
  axios.post(`${API_URL}/verify-and-release`, data);

// Re-verify a previously submitted task
export const reverify = (id, data) =>
  axios.post(`${API_URL}/reverify/${id}`, data);