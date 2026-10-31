import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Loader2, Pencil, X } from 'lucide-react';
import AmountInput from './AmountInput';
import { useAuthStore } from '../store/useAuthStore';
import { useModalHistory } from '../hooks/useModalHistory';
import { saveCommitment, subscribeCommitments } from '../services/commitmentService';
import { applyCommitmentChange, monthKey, summarizeCommitment } from '../lib/commitments';
import { cn, formatCurrency } from '../lib/utils';
import { toast } from '../store/useToastStore';
import type { CommitmentPeriod } from '../types';

interface CommitmentCardProps {
  userId: string;
  userName: string;
  contributions: { amount: number; date: Date }[];
}

export default function CommitmentCard({ userId, userName, contributions }: CommitmentCardProps) {
  const actor = useAuthStore((state) => state.user);
  const canEdit = actor?.role !== 'collaborator';

  const [periods, setPeriods] = useState<CommitmentPeriod[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(
    () => subscribeCommitments((all) => setPeriods(all.find((c) => c.userId === userId)?.periods ?? [])),
    [userId]
  );
  useModalHistory(showForm, () => setShowForm(false));

  const summary = useMemo(() => summarizeCommitment(periods ?? [], contributions), [periods, contributions]);

  if (periods === null || (!summary && !canEdit)) return null;

  const openForm = () => {
    setAmount(summary ? String(summary.monthlyAmount) : '');
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !actor) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) return;
    setSaving(true);
    try {
      await saveCommitment({
        userId,
        userName,
        periods: applyCommitmentChange(periods, monthKey(new Date()), value),
        fromAmount: summary?.monthlyAmount ?? 0,
        toAmount: value,
        actor,
      });
      toast('Compromiso guardado');
      setShowForm(false);
    } catch (error) {
      console.error('Error al guardar el compromiso:', error);
      toast('No se pudo guardar el compromiso. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <CalendarCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800">Compromiso mensual</h3>
          <p className="text-xs text-gray-500 truncate">Lo que {userName} acordó aportar cada mes</p>
        </div>
        {canEdit && summary && (
          <button onClick={openForm} aria-label="Cambiar compromiso" className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {summary ? (
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Acordado por mes:</span>
            <span className="font-bold text-gray-900">{formatCurrency(summary.monthlyAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Aportado este mes:</span>
            <span className="font-bold text-blue-600">{formatCurrency(summary.paidThisMonth)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-600">
              {summary.balance < 0 ? 'Pendiente a la fecha:' : summary.balance > 0 ? 'Adelantado:' : 'Estado:'}
            </span>
            <span className={cn('font-bold', summary.balance < 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {summary.balance === 0 ? 'Al día' : formatCurrency(Math.abs(summary.balance))}
            </span>
          </div>
        </div>
      ) : (
        <button onClick={openForm} className="w-full mt-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
          Definir compromiso
        </button>
      )}

      {showForm && (
        <div role="dialog" aria-modal="true" aria-label="Compromiso mensual" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form onSubmit={handleSave} className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Compromiso de {userName}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-gray-400">$</span>
              <AmountInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
                aria-label="Valor mensual"
                autoFocus
                className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 bg-emerald-50/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
              />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Rige desde este mes; los meses anteriores conservan lo que se había acordado. Pon 0 si deja de aportar de forma fija.
            </p>
            <button
              type="submit"
              disabled={saving || amount === ''}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              Guardar compromiso
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
