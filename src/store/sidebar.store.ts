import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SidebarStore {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,

      toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),

      setCollapsed: (collapsed: boolean) => set({ isCollapsed: collapsed }),

      openMobile: () => set({ isMobileOpen: true }),

      closeMobile: () => set({ isMobileOpen: false }),

      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
    }),
    {
      name: 'viora-sidebar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);

export default useSidebarStore;