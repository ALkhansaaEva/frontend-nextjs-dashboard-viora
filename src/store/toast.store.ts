import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  detail?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (variant: ToastVariant, message: string, detail?: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (variant, message, detail) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, variant, message, detail }] }));
    const ttl = variant === 'error' ? 8000 : 4500;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, ttl);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Central structured-error/success feedback — use this instead of alert() or
 * silently swallowed catch blocks for any Admin mutation. Extracts a readable
 * message from the shared api-client's normalized error shape when given one.
 */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (message: string, detail?: string) => push('success', message, detail),
    info: (message: string, detail?: string) => push('info', message, detail),
    error: (message: string, err?: unknown) => {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : undefined;
      push('error', message, detail);
    },
  };
}
