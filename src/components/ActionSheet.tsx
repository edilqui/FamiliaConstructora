import { ComponentType, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { runAfterModalClosed, useModalHistory } from '../hooks/useModalHistory';
import { cn } from '../lib/utils';

export interface SheetAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string; // Por qué está deshabilitada
}

interface ActionSheetProps {
  open: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
}

// Menú inferior de acciones: opciones grandes y eliminar separado de las demás
export default function ActionSheet({ open, title, actions, onClose }: ActionSheetProps) {
  useModalHistory(open, onClose);
  if (!open) return null;

  const safe = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  const renderAction = (action: SheetAction) => {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        disabled={action.disabled}
        onClick={() => { onClose(); runAfterModalClosed(action.onClick); }}
        className={cn(
          'w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl text-left font-semibold transition-colors disabled:opacity-40',
          action.danger ? 'text-red-600 active:bg-red-50' : 'text-gray-800 active:bg-gray-100',
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="min-w-0">
          <span className="block truncate">{action.label}</span>
          {action.hint && <span className="block text-xs font-normal text-gray-500">{action.hint}</span>}
        </span>
      </button>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl px-3 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-10 duration-200">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
        <p className="px-3 pb-2 text-sm font-bold text-gray-500 truncate">{title}</p>
        <div>{safe.map(renderAction)}</div>
        {danger.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">{danger.map(renderAction)}</div>
        )}
      </div>
    </div>
  );
}

interface MoreButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}

export function MoreButton({ label, onClick, className }: MoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('w-11 h-11 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100 flex-shrink-0', className)}
    >
      <MoreVertical className="w-5 h-5" />
    </button>
  );
}
