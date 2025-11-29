import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://backend-prod-6uuq.onrender.com/",
  withCredentials: true,  // MUST BE HERE ONLY
});

export default api;

