import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
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
        // Single write — the axios interceptor reads from Zustand's persisted
        // storage key "vt_auth", so we no longer need a separate vt_token key.
        set({ token, user, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "vt_auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist token + user — hydrated/isAuthenticated are derived at runtime.
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.token) {
          state.isAuthenticated = true;
        }
        state.hydrated = true;
      },
    }
  )
);
