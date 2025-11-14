import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-prod-03dl.onrender.com/api",
  withCredentials: true,  // MUST BE HERE ONLY
});

export default api;
