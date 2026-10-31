import { useMemo, useState } from 'react';
import { ArrowLeft, Link2, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDashboardData } from '../hooks/useDashboardData';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { cn, formatCurrency } from '../lib/utils';
import { reviewDirectPayments } from '../lib/directPayments';
import { linkDirectPayments } from '../services/transactionService';
import { toast } from '../store/useToastStore';
import ContributionForm from './ContributionForm';

// Revisión de los pagos directos guardados antes de existir el vínculo. Solo
// vincula lo que coincide exactamente; nunca elimina movimientos por su cuenta.
export default function DirectPaymentsReview() {
  const goBack = useSmartBack('/settings');
  const { transactions, users, loading } = useDashboardData();
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();
  const [linking, setLinking] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { pairs, unmatched } = useMemo(() => reviewDirectPayments(transactions), [transactions]);
  const contributionToEdit = unmatched.find((t) => t.id === editId);
  const unmatchedTotal = unmatched.reduce((sum, t) => sum + t.amount, 0);

  const handleLink = async () => {
    setLinking(true);
    try {
      await linkDirectPayments(pairs);
      toast(`${pairs.length} ${pairs.length === 1 ? 'pago vinculado' : 'pagos vinculados'}`);
    } catch {
      toast('No se pudieron vincular todos los pagos. Intenta de nuevo.', { type: 'error' });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={goBack} aria-label="Volver" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Revisar pagos directos</h1>
            <p className="text-xs text-gray-500">Aportes registrados antes de vincularlos a su gasto</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : pairs.length === 0 && unmatched.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-gray-700 text-sm font-medium">No hay pagos directos por revisar</p>
          </div>
        ) : (
          <>
            {pairs.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800">{pairs.length} {pairs.length === 1 ? 'pago listo' : 'pagos listos'} para vincular</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Aporte y gasto tienen el mismo monto, fecha y persona que registró. Los saldos no cambian.</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {pairs.map(({ contribution, expense }) => (
                    <div key={contribution.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{expense.description}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {users.find((u) => u.id === contribution.userId)?.name ?? 'Usuario'} · {format(contribution.date, 'd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">{formatCurrency(contribution.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={handleLink}
                    disabled={linking}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Vincular {pairs.length === 1 ? 'pago' : `${pairs.length} pagos`}
                  </button>
                </div>
              </section>
            )}

            {unmatched.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-gray-800">{unmatched.length} {unmatched.length === 1 ? 'aporte' : 'aportes'} sin gasto · {formatCurrency(unmatchedTotal)}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Su gasto se borró o se editó después. Si el gasto ya no existe, este dinero podría no estar en la caja. Revisen cada caso antes de eliminarlo.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {unmatched.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setEditId(c.id)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.description}</p>
                        <p className="text-xs text-gray-500">{format(c.date, 'd MMM yyyy • HH:mm', { locale: es })}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(c.amount)}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {contributionToEdit && (
        <ContributionForm onClose={() => setEditId(null)} transactionToEdit={contributionToEdit} />
      )}
    </div>
  );
}
