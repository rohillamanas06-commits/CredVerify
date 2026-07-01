import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle global errors here like 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface AuthUser {
  sub: string;
  role: string;
  name?: string;
  email?: string;
  wallet?: string;
}

export function getUser(): AuthUser | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload) as AuthUser;
  } catch (error) {
    return null;
  }
}

export type Role = "institution" | "candidate" | "employer";

export function setAuth(token: string) {
  localStorage.setItem("token", token);
  window.dispatchEvent(new Event("credchain-auth"));
}

export function clearAuth() {
  localStorage.removeItem("token");
  window.dispatchEvent(new Event("credchain-auth"));
}


