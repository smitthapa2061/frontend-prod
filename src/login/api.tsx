import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-prod-d80y.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
});

export default api;

