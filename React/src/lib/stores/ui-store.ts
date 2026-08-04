import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UiTheme = "light" | "dark" | "system";

interface UiState {
  sidebarOpen: boolean;
  mobileNavVisible: boolean;
  themePreference: UiTheme;
  roleAccent: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setThemePreference: (theme: UiTheme) => void;
  setRoleAccent: (role: string | null) => void;
}

/** Client-only UI state (sidebar, theme). Server data stays in TanStack Query. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Closed by default — open on desktop after mount to avoid mobile cover.
      sidebarOpen: false,
      mobileNavVisible: true,
      themePreference: "system",
      roleAccent: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setThemePreference: (themePreference) => set({ themePreference }),
      setRoleAccent: (roleAccent) => set({ roleAccent }),
    }),
    {
      name: "rankup-ui",
      partialize: (state) => ({
        themePreference: state.themePreference,
      }),
    },
  ),
);
