import { create } from 'zustand';

type NavState = {
  returnTo: string | null;
  setReturnTo: (path: string) => void;
  clearReturnTo: () => void;
  consumeReturnTo: () => string | null;
};

export const useNavigationStore = create<NavState>((set, get) => ({
  returnTo: null,
  setReturnTo: (path) => set({ returnTo: path }),
  clearReturnTo: () => set({ returnTo: null }),
  consumeReturnTo: () => {
    const path = get().returnTo;
    set({ returnTo: null });
    return path;
  },
}));
