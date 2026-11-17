import { create } from "zustand";
import { api } from "@/services/api";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  plan_tier: string;
  credits_remaining: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("reve_access_token"),
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  fetchUser: async () => {
    const token = localStorage.getItem("reve_access_token");
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("reve_access_token");
    localStorage.removeItem("reve_refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));
