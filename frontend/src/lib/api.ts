import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — inject JWT ──────────────────────────────────────────
// Reads from Zustand's persisted "vt_auth" key (single source of truth).
// We intentionally avoid importing useAuthStore here to prevent circular deps.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("vt_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        const token: string | null = parsed?.state?.token ?? null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Corrupted storage — silently proceed unauthenticated
    }
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      // Do NOT redirect on 401 from the login endpoint itself (wrong credentials).
      !error.config?.url?.includes("/auth/login")
    ) {
      // Wipe Zustand persisted state — clearAuth() would require importing the
      // store and creates circular deps, so we clear the storage key directly.
      localStorage.removeItem("vt_auth");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Error message extractor ───────────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string | Array<{ msg: string }> })?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
    if (error.response?.status === 422) return "Validation error — please check your inputs.";
    if (error.response?.status === 403) return "You don't have permission to do that.";
    if (error.response?.status === 404) return "Resource not found.";
    if (error.response?.status === 409) return "This resource already exists.";
    if (error.response?.status === 429) return "Too many requests — please wait a moment and try again.";
    if (error.message) return error.message;
  }
  return "An unexpected error occurred.";
}
