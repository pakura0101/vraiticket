import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — inject JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — handle 401 carefully ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      // Only redirect on 401 for protected endpoints — NOT for login itself.
      // The login endpoint path contains "/auth/login"; if that fails with
      // 401 (bad credentials) we must NOT wipe the token or redirect.
      !error.config?.url?.includes("/auth/login")
    ) {
      // Token is expired or invalid — clear session and go to login
      localStorage.removeItem("vt_token");

      // Also clear zustand store without importing it (avoids circular deps)
      try {
        const raw = localStorage.getItem("vt_auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state = { token: null, user: null };
          localStorage.setItem("vt_auth", JSON.stringify(parsed));
        }
      } catch {
        // ignore JSON parse errors
      }

      // Avoid redirect loop: only redirect if not already on /login
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
    if (Array.isArray(detail)) return detail.map(d => d.msg).join(", ");
    // Fallback for non-standard error shapes
    if (error.response?.status === 422) return "Validation error — please check your inputs.";
    if (error.response?.status === 403) return "You don't have permission to do that.";
    if (error.response?.status === 404) return "Resource not found.";
    if (error.response?.status === 409) return "This resource already exists.";
    if (error.message) return error.message;
  }
  return "An unexpected error occurred.";
}
