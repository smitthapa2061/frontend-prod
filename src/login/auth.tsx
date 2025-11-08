import api from "./api";
import { getCache, setCache, removeCache } from "../dashboard/cache";

const AUTH_CACHE_KEY = "auth_user";

const checkAuth = async () => {
  // Try cache first (5 minutes TTL)
  const cached = getCache(AUTH_CACHE_KEY, 1000 * 60 * 5);
  if (cached) return cached;

  try {
    const { data } = await api.get("/users/me"); // must send cookie
    setCache(AUTH_CACHE_KEY, data);
    return data;
  } catch (err: any) {
    // On unauthorized, clear cache to avoid stale user
    removeCache(AUTH_CACHE_KEY);
    return null;
  }
};

export default checkAuth;
