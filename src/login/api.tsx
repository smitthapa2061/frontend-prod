import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://backend-prod-530t.onrender.com/",
  withCredentials: true, // important for session cookie
});

export default api;
