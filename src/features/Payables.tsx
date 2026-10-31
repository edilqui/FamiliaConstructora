import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit2, Loader2, Phone, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import ConfirmDialog from '../components/ConfirmDialog';
import TransactionForm from './TransactionForm';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { useModalHistory } from '../hooks/useModalHistory';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { isOverdue, summarizePayables } from '../lib/payables';
import { cn, formatCurrency } from '../lib/utils';
import {
  createPayable, deletePayable, markPayablePaid, reopenPayable, subscribePayables, updatePayable,
} from '../services/payableService';
import { toast } from '../store/useToastStore';
import type { Payable } from '../types';

interface PayableFormData {
  supplierName: string;
  supplierPhone: string;
  description: string;
  amount: string;
  dueDate: string;
}

const emptyForm = (): PayableFormData => ({
  supplierName: '', supplierPhone: '', description: '', amount: '', dueDate: format(new Date(), 'yyyy-MM-dd'),
});

export default function Payables() {
  const goBack = useSmartBack('/settings');
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role !== 'collaborator';
  const { transactions, totalInBox, loading: dataLoading } = useDashboardData();
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const [payables, setPayables] = useState<Payable[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<'pending' | 'paid'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);
  const [form, setForm] = useState<PayableFormData>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<Payable | null>(null);
  const [deleting, setDeleting] = useState<Payable | null>(null);
  const [reopening, setReopening] = useState<Payable | null>(null);

  useEffect(() => subscribePayables(setPayables, () => setLoadFailed(true)), []);
  useModalHistory(showForm, () => setShowForm(false));

  const summary = useMemo(() => summarizePayables(payables ?? []), [payables]);
  const visible = useMemo(
    () => (payables ?? [])
      .filter((p) => p.status === tab)
      .sort((a, b) => (tab === 'pending' ? 1 : -1) * (a.dueDate.getTime() - b.dueDate.getTime())),
    [payables, tab]
  );
  const supplierNames = useMemo(() => [...new Set((payables ?? []).map((p) => p.supplierName))], [payables]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (payable: Payable) => {
    setEditing(payable);
    setForm({
      supplierName: payable.supplierName,
      supplierPhone: payable.supplierPhone ?? '',
      description: payable.description,
      amount: String(Math.round(payable.amount)),
      dueDate: format(payable.dueDate, 'yyyy-MM-dd'),
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSupplierChange = (name: string) => {
    const known = (payables ?? []).find((p) => p.supplierName === name && p.supplierPhone);
    setForm((f) => ({ ...f, supplierName: name, supplierPhone: known?.supplierPhone ?? f.supplierPhone }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !user) return;
    const amount = parseFloat(form.amount);
    if (!form.supplierName.trim()) return setFormError('Indica el proveedor');
    if (!form.description.trim()) return setFormError('Indica qué se debe');
    if (!amount || amount <= 0) return setFormError('Ingresa un monto válido');
    if (!form.dueDate) return setFormError('Indica la fecha de pago');

    const [year, month, day] = form.dueDate.split('-').map(Number);
    const input = {
      supplierName: form.supplierName.trim(),
      supplierPhone: form.supplierPhone.trim() || undefined,
      description: form.description.trim(),
      amount,
      dueDate: new Date(year, month - 1, day),
    };

    setSaving(true);
    setFormError('');
    try {
      if (editing) await updatePayable(editing, input, user);
      else await createPayable(input, user);
      toast(editing ? 'Cuenta actualizada' : 'Cuenta registrada');
      setShowForm(false);
    } catch (error) {
      console.error('Error al guardar la cuenta:', error);
      setFormError('Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // El gasto ya se guardó: un fallo aquí no debe llevar a registrarlo otra vez
  const handlePaid = async (payable: Payable, transactionId: string) => {
    if (!user) return;
    try {
      await markPayablePaid(payable, transactionId, user);
    } catch (error) {
      console.error('Error al marcar la cuenta como pagada:', error);
      toast('El gasto quedó registrado, pero la cuenta sigue pendiente. No registres el pago otra vez.', { type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !user || saving) return;
    setSaving(true);
    try {
      await deletePayable(deleting, user);
      toast('Cuenta eliminada');
    } catch (error) {
      console.error('Error al eliminar la cuenta:', error);
      toast('No se pudo eliminar. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSaving(false);
      setDeleting(null);
    }
  };

  const confirmReopen = async () => {
    if (!reopening || !user || saving) return;
    setSaving(true);
    try {
      await reopenPayable(reopening, user);
      toast('La cuenta volvió a pendiente');
    } catch (error) {
      console.error('Error al reabrir la cuenta:', error);
      toast('No se pudo cambiar. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSaving(false);
      setReopening(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm',
          'transition-transform duration-300 ease-in-out',
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={goBack} aria-label="Volver" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Cuentas por pagar</h1>
            <p className="text-xs text-gray-500">Lo que se le debe a cada proveedor</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-4 max-w-4xl mx-auto">
        {loadFailed ? (
          <p className="text-center text-sm text-red-600 py-12">No se pudieron cargar las cuentas. Revisa tu conexión y vuelve a intentarlo.</p>
        ) : payables === null || dataLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total por pagar:</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalPending)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Saldo en caja:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalInBox)}</span>
              </div>
              {summary.totalPending > totalInBox && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                  A la caja le faltan {formatCurrency(summary.totalPending - totalInBox)} para cubrir todo lo pendiente.
                </p>
              )}
              {summary.overdueCount > 0 && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {summary.overdueCount === 1 ? '1 cuenta vencida' : `${summary.overdueCount} cuentas vencidas`} por {formatCurrency(summary.overdueAmount)}
                </p>
              )}
            </div>

            {summary.bySupplier.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Deuda por proveedor</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                  {summary.bySupplier.map((s) => (
                    <div key={s.name} className="p-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.count === 1 ? '1 cuenta' : `${s.count} cuentas`}</p>
                      </div>
                      {s.phone && (
                        <a href={`tel:${s.phone}`} aria-label={`Llamar a ${s.name}`} className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Phone className="w-[18px] h-[18px]" />
                        </a>
                      )}
                      <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(s.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex bg-gray-100 rounded-2xl p-1">
              {(['pending', 'paid'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'flex-1 py-2 text-sm font-semibold rounded-xl transition-all',
                    tab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                  )}
                >
                  {value === 'pending' ? 'Pendientes' : 'Pagadas'}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-10">
                {tab === 'pending' ? 'No hay cuentas pendientes' : 'Aún no hay cuentas pagadas'}
              </p>
            ) : (
              <div className="space-y-3">
                {visible.map((p) => {
                  const overdue = isOverdue(p);
                  const expenseMissing = p.status === 'paid' && !transactions.some((t) => t.id === p.paidTransactionId);
                  return (
                    <div key={p.id} className={cn('bg-white rounded-2xl shadow-sm border p-4', overdue ? 'border-red-200' : 'border-gray-100')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 break-words">{p.description}</p>
                          <p className="text-xs text-gray-500 truncate">{p.supplierName}</p>
                        </div>
                        <p className="text-base font-bold text-gray-900 tabular-nums flex-shrink-0">{formatCurrency(p.amount)}</p>
                      </div>
                      <p className={cn('text-xs mt-1', overdue ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                        {overdue ? 'Venció el ' : p.status === 'paid' ? 'Vencía el ' : 'Vence el '}
                        {format(p.dueDate, "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                      {expenseMissing && (
                        <p className="text-xs text-amber-700 mt-1">El gasto de este pago ya no existe en Movimientos.</p>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-1 mt-3">
                          {p.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => setPaying(p)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Registrar pago
                              </button>
                              <button onClick={() => openEdit(p)} aria-label={`Editar ${p.description}`} className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit2 className="w-[18px] h-[18px]" />
                              </button>
                              <button onClick={() => setDeleting(p)} aria-label={`Eliminar ${p.description}`} className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-[18px] h-[18px]" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setReopening(p)}
                              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Volver a pendiente
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {canEdit && (
        <button
          onClick={openNew}
          className="fixed bottom-20 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl active:scale-95 transition-all z-40 flex items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium text-sm pr-1">Cuenta</span>
        </button>
      )}

      {showForm && (
        <div role="dialog" aria-modal="true" aria-label="Cuenta por pagar" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form onSubmit={handleSave} className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{formError}</p>}
            <div>
              <label htmlFor="payable-supplier" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Proveedor</label>
              <input
                id="payable-supplier"
                list="payable-suppliers"
                value={form.supplierName}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <datalist id="payable-suppliers">
                {supplierNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="payable-phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Teléfono (Opcional)</label>
              <input
                id="payable-phone"
                type="tel"
                value={form.supplierPhone}
                onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label htmlFor="payable-description" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">¿Qué se debe?</label>
              <input
                id="payable-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: 50 bultos de cemento"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Monto</label>
                <AmountInput
                  value={form.amount}
                  onChange={(v) => setForm({ ...form, amount: v })}
                  placeholder="0"
                  aria-label="Monto de la cuenta"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="payable-due" className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Pagar antes de</label>
                <input
                  id="payable-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Registrar cuenta'}
            </button>
          </form>
        </div>
      )}

      {paying && (
        <TransactionForm
          onClose={() => setPaying(null)}
          prefill={{ amount: paying.amount, description: `${paying.description} (${paying.supplierName})` }}
          onSaved={(transactionId) => handlePaid(paying, transactionId)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="¿Eliminar cuenta?"
        message="Se quita de la lista de pendientes. No afecta la caja."
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={reopening !== null}
        title="¿Volver a pendiente?"
        message="El gasto del pago no se elimina. Si también sobra, elimínalo en Movimientos."
        confirmLabel="Sí, volver a pendiente"
        loading={saving}
        onConfirm={confirmReopen}
        onCancel={() => setReopening(null)}
      />
    </div>
  );
}
