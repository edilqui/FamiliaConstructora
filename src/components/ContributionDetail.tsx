import { X, TrendingUp, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getReceipt } from '../services/receiptService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../lib/utils';
import { useModalHistory } from '../hooks/useModalHistory';
import type { Transaction } from '../types';

interface ContributionDetailProps {
  contribution: Transaction;
  runningTotal?: number;
  registeredByName?: string;
  onClose: () => void;
  onEdit: () => void;
  canEdit?: boolean;
}

// Detalle de solo lectura: consultar un aporte no debe abrir directamente el
// formulario que permite modificarlo o eliminarlo.
export default function ContributionDetail({ contribution, runningTotal, registeredByName, onClose, onEdit, canEdit = true }: ContributionDetailProps) {
  useModalHistory(true, onClose);

  const [receipt, setReceipt] = useState<string | null>(null);
  useEffect(() => {
    if (!contribution.hasReceipt) return;
    getReceipt(contribution.id).then(setReceipt).catch(() => setReceipt(null));
  }, [contribution.id, contribution.hasReceipt]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Detalle del aporte" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Detalle del aporte</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar detalle" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">+{formatCurrency(contribution.amount)}</p>
            <p className="text-sm font-medium text-gray-800 mt-1 break-words">{contribution.description}</p>
          </div>

          <dl className="divide-y divide-gray-100 border-y border-gray-100 text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-gray-500">Fecha</dt>
              <dd className="font-medium text-gray-900 text-right">{format(contribution.date, "d MMM yyyy • HH:mm", { locale: es })}</dd>
            </div>
            {runningTotal !== undefined && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-gray-500">Acumulado hasta aquí</dt>
                <dd className="font-medium text-gray-900 tabular-nums">{formatCurrency(runningTotal)}</dd>
              </div>
            )}
            {registeredByName && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-gray-500">Registrado por</dt>
                <dd className="font-medium text-gray-900 text-right">{registeredByName}</dd>
              </div>
            )}
            {contribution.notes && (
              <div className="py-3">
                <dt className="text-gray-500 mb-1">Notas</dt>
                <dd className="text-gray-900 whitespace-pre-wrap break-words">{contribution.notes}</dd>
              </div>
            )}
          </dl>

          {receipt && (
            <img src={receipt} alt="Comprobante del aporte" className="w-full max-h-72 object-contain bg-gray-900/5 rounded-xl border border-gray-200" />
          )}

          {!canEdit ? (
            <p className="text-xs text-blue-800 bg-blue-50/70 border border-blue-100 rounded-xl p-3 leading-relaxed">
              Solo un miembro puede cambiar o eliminar un aporte ya registrado.
            </p>
          ) : contribution.linkedTransactionId ? (
            <p className="text-xs text-blue-800 bg-blue-50/70 border border-blue-100 rounded-xl p-3 leading-relaxed">
              Este aporte viene de un pago directo. Para cambiarlo o eliminarlo, abre su gasto en Movimientos.
            </p>
          ) : (
            <button
              onClick={onEdit}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar o eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
