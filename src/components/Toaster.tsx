import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import { cn } from '../lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

/**
 * Contenedor global de toasts. Se renderiza en Layout, por encima de la
 * BottomNav, para confirmar acciones (guardado, eliminado, deshacer).
 */
export default function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] left-4 right-4 z-[80] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-200',
              t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white',
            )}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', t.type === 'success' && 'text-emerald-400')} />
            <p className="flex-1">{t.message}</p>
            {t.actionLabel && (
              <button
                onClick={() => { t.onAction?.(); dismiss(t.id); }}
                className="flex-shrink-0 min-h-11 text-emerald-300 font-bold uppercase text-xs tracking-wide px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 opacity-70" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
