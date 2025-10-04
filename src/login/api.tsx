import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-prod-530t.onrender.com/api",
  withCredentials: true, // important for session cookie
});

export default api;
