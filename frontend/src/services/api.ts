import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Resolves relative backend asset and image paths (e.g. "/api/v1/images/file/...")
 * against the configured backend origin, preserving absolute URLs, data URIs, and blob URIs.
 */
export const resolveImageUrl = (url?: string): string => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    try {
      const origin = new URL(API_BASE_URL).origin;
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      return `${origin}${cleanPath}`;
    } catch {
      return url;
    }
  }
  return url;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s timeout to gracefully accommodate Render free-tier cold starts
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reve_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("reve_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newToken = res.data.access_token;
          localStorage.setItem("reve_access_token", newToken);
          if (res.data.refresh_token) {
            localStorage.setItem("reve_refresh_token", res.data.refresh_token);
          }
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (e) {
          localStorage.removeItem("reve_access_token");
          localStorage.removeItem("reve_refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);
