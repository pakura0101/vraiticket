import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;           // ← key flag: has zustand rehydrated from storage yet?
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      user:            null,
      hydrated:        false,
      isAuthenticated: false,

      setAuth: (token, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("vt_token", token);
        }
        set({ token, user, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("vt_token");
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "vt_auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist token + user — not hydrated/isAuthenticated (those are derived)
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Restore isAuthenticated from persisted token
        if (state.token) {
          state.isAuthenticated = true;
          if (typeof window !== "undefined") {
            localStorage.setItem("vt_token", state.token);
          }
        }
        // Signal that hydration is complete
        state.hydrated = true;
      },
    }
  )
);
