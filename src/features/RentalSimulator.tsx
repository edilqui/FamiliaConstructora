import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardData } from '../hooks/useDashboardData';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { simulateRental } from '../lib/rental';
import { cn, formatCurrency } from '../lib/utils';
import { saveRentalScenario, subscribeRentalScenarios } from '../services/rentalService';
import { toast } from '../store/useToastStore';
import type { RentalScenario } from '../types';

const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none';
const labelClass = 'text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1';

interface FormState {
  totalCost: string;
  units: string;
  rent: string;
  expenses: string;
  occupancy: string;
  increase: string;
}

const formatYears = (years: number | null) => {
  if (years === null) return 'No se recupera';
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (months === 12) return `${whole + 1} años`;
  return months > 0 ? `${whole} años y ${months} meses` : `${whole} años`;
};

export default function RentalSimulator() {
  const goBack = useSmartBack('/balance');
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role !== 'collaborator';
  const { projects, transactions, memberCount, loading } = useDashboardData();
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const [scenarios, setScenarios] = useState<RentalScenario[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeRentalScenarios(setScenarios, () => setLoadFailed(true)), []);

  const selectedProjectId = projectId || projects[0]?.id || '';
  const project = projects.find((p) => p.id === selectedProjectId);
  const spent = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && t.projectId === selectedProjectId).reduce((s, t) => s + t.amount, 0),
    [transactions, selectedProjectId]
  );
  // Si ya se gastó más que el presupuesto, el costo real es lo gastado
  const suggestedCost = Math.max(project?.budget ?? 0, spent);

  // Lo guardado llega una sola vez por proyecto, para no pisar lo que se está probando
  useEffect(() => {
    if (scenarios === null || loading || !selectedProjectId) return;
    const saved = scenarios.find((s) => s.projectId === selectedProjectId);
    setForm({
      totalCost: String(Math.round(saved?.totalCost ?? suggestedCost)),
      units: String(saved?.units ?? 1),
      rent: saved ? String(saved.monthlyRentPerUnit) : '',
      expenses: saved ? String(saved.monthlyExpensesPerUnit) : '',
      occupancy: String(saved?.occupancyPercent ?? 90),
      increase: String(saved?.annualIncreasePercent ?? 5),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, scenarios === null, loading]);

  const input = form && {
    totalCost: parseFloat(form.totalCost) || 0,
    units: Math.max(0, parseInt(form.units) || 0),
    monthlyRentPerUnit: parseFloat(form.rent) || 0,
    monthlyExpensesPerUnit: parseFloat(form.expenses) || 0,
    occupancyPercent: Math.min(100, Math.max(0, parseFloat(form.occupancy) || 0)),
    annualIncreasePercent: Math.max(0, parseFloat(form.increase) || 0),
    owners: memberCount,
  };
  const result = input && simulateRental(input);
  const ready = !!input && input.totalCost > 0 && input.units > 0 && input.monthlyRentPerUnit > 0;

  const handleSave = async () => {
    if (!input || !user || saving) return;
    setSaving(true);
    try {
      const { owners: _owners, ...scenario } = input;
      await saveRentalScenario({ projectId: selectedProjectId, ...scenario }, user.id);
      toast('Escenario guardado para todos');
    } catch (error) {
      console.error('Error al guardar el escenario:', error);
      toast('No se pudo guardar. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
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
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Simulador de arriendo</h1>
            <p className="text-xs text-gray-500">¿En cuánto se recupera lo invertido?</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-4 max-w-2xl mx-auto">
        {loadFailed ? (
          <p className="text-center text-sm text-red-600 py-12">No se pudo cargar el simulador. Revisa tu conexión y vuelve a intentarlo.</p>
        ) : loading || scenarios === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : !project || !form || !input || !result ? (
          <p className="text-center text-sm text-gray-500 py-12">Crea un proyecto para usar el simulador.</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
              <div>
                <label htmlFor="rental-project" className={labelClass}>Proyecto</label>
                <select id="rental-project" value={selectedProjectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Costo total de la obra</label>
                <AmountInput value={form.totalCost} onChange={(v) => setForm({ ...form, totalCost: v })} placeholder="0" aria-label="Costo total" className={inputClass} />
                <p className="text-[11px] text-gray-500 mt-1 ml-1">
                  Gastado: {formatCurrency(spent)} · Presupuesto: {formatCurrency(project.budget)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rental-units" className={labelClass}>Apartaestudios</label>
                  <input id="rental-units" type="number" min="1" inputMode="numeric" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Arriendo mensual c/u</label>
                  <AmountInput value={form.rent} onChange={(v) => setForm({ ...form, rent: v })} placeholder="0" aria-label="Arriendo mensual" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Gastos mensuales c/u</label>
                  <AmountInput value={form.expenses} onChange={(v) => setForm({ ...form, expenses: v })} placeholder="0" aria-label="Gastos mensuales" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="rental-occupancy" className={labelClass}>Ocupación %</label>
                  <input id="rental-occupancy" type="number" min="0" max="100" inputMode="decimal" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="rental-increase" className={labelClass}>Aumento anual %</label>
                <input id="rental-increase" type="number" min="0" step="any" inputMode="decimal" value={form.increase} onChange={(e) => setForm({ ...form, increase: e.target.value })} className={inputClass} />
              </div>
            </div>

            {!ready ? (
              <p className="text-center text-sm text-gray-500 py-6">Indica el costo, los apartaestudios y el arriendo para ver el resultado.</p>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 pb-2 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">Se recupera en</span>
                    <span className={cn('text-lg font-bold text-right', result.paybackYears === null ? 'text-red-600' : 'text-emerald-600')}>{formatYears(result.paybackYears)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600"><span>Costo por apartaestudio</span><span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(result.costPerUnit)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Entra al mes</span><span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(result.monthlyIncome)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Gastos al mes</span><span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(result.monthlyExpenses)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Queda al mes</span><span className={cn('font-semibold tabular-nums', result.monthlyNet < 0 ? 'text-red-600' : 'text-gray-900')}>{formatCurrency(result.monthlyNet)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Para cada uno de {memberCount} miembros</span><span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(result.monthlyNetPerOwner)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Rentabilidad anual</span><span className="font-semibold text-gray-900 tabular-nums">{result.annualYieldPercent.toFixed(1)}%</span></div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Si la ocupación cambia</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                    {[100, 85, 70, 50].map((occupancy) => {
                      const alt = simulateRental({ ...input, occupancyPercent: occupancy });
                      return (
                        <div key={occupancy} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                          <span className="font-semibold text-gray-700">{occupancy}%</span>
                          <span className="text-gray-600 tabular-nums">{formatCurrency(alt.monthlyNet)}/mes</span>
                          <span className="text-gray-900 font-semibold text-right">{formatYears(alt.paybackYears)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed px-1">
                  Es una estimación con tus supuestos. No incluye créditos, impuestos sobre la renta, reparaciones grandes ni la valorización del inmueble.
                </p>
              </>
            )}

            {canEdit ? (
              <button onClick={handleSave} disabled={saving} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                Guardar para todos
              </button>
            ) : (
              <p className="text-xs text-center text-gray-500">Puedes probar valores; solo un miembro guarda el escenario compartido.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
