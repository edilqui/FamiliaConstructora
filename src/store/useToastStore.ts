import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOptions {
  type?: ToastType;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, options = {}) => {
    const id = nextId++;
    const toast: Toast = {
      id,
      message,
      type: options.type ?? 'success',
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    };
    // Máximo 3 toasts visibles a la vez
    set((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
    // Con acción ("Deshacer") se da más tiempo para reaccionar
    const duration = options.duration ?? (options.actionLabel ? 8000 : 3500);
    setTimeout(() => get().dismiss(id), duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Atajo para usar fuera de componentes React */
export const toast = (message: string, options?: ToastOptions) =>
  useToastStore.getState().show(message, options);
