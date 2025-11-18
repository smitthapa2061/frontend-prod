import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-prod-bs4c.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
});

export default api;
