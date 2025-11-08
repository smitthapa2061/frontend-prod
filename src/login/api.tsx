import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true, // important for session cookie
});

// Add request interceptor to handle cookies properly
api.interceptors.request.use((config) => {
  // For production, ensure cookies are sent properly
  if (process.env.NODE_ENV === 'production') {
    config.headers = config.headers || {};
    // Ensure credentials are included
    config.withCredentials = true;
  }
  return config;
});

export default api;
