import { ReactNode } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación destructiva unificada (reemplaza window.confirm).
 * Cubre toda la pantalla (incluida la BottomNav) y el atrás del sistema la cierra.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Sí, eliminar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useModalHistory(open, onCancel);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">{message}</div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
