import { create } from 'zustand';
import { semantic } from '@/theme/semantic';
import { motion } from '@/theme/motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  persistent: boolean;
};

type ToastState = {
  queue: ToastItem[];
  show: (opts: {
    message: string;
    type?: ToastType;
    duration?: number;
    persistent?: boolean;
  }) => void;
  dismiss: (id: string) => void;
};

let idSeq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  queue: [],
  show: ({ message, type = 'info', duration, persistent }) => {
    const id = `toast-${++idSeq}`;
    const isError = type === 'error';
    const item: ToastItem = {
      id,
      message,
      type,
      duration:
        duration ??
        (isError || persistent ? motion.toastErrorDismissMs : motion.toastAutoDismissMs),
      persistent: persistent ?? isError,
    };
    set({ queue: [...get().queue, item] });
    if (item.duration > 0) {
      setTimeout(() => get().dismiss(id), item.duration);
    }
  },
  dismiss: (id) => set({ queue: get().queue.filter((t) => t.id !== id) }),
}));

export function toast(
  message: string,
  type: ToastType = 'info',
  opts?: { duration?: number; persistent?: boolean },
) {
  useToastStore.getState().show({ message, type, ...opts });
}

export function toastSemantic(type: ToastType) {
  return semantic[type === 'info' ? 'info' : type];
}
