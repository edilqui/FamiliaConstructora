import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, Calculator, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import AmountInput from '../components/AmountInput';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuthStore } from '../store/useAuthStore';
import { useConstructionData } from '../hooks/useConstructionData';
import { useDashboardData } from '../hooks/useDashboardData';
import { useModalHistory } from '../hooks/useModalHistory';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { addTemplateItems, computeEstimate, ESTIMATE_TEMPLATES } from '../lib/estimates';
import { buildMaterialHistory, findMaterial, type MaterialHistory } from '../lib/materials';
import { cn, formatCurrency } from '../lib/utils';
import { updateActivity } from '../services/activityService';
import { deleteEstimate, saveEstimate, subscribeEstimates } from '../services/estimateService';
import { toast } from '../store/useToastStore';
import type { Activity, Estimate, EstimateItem } from '../types';

const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-400 outline-none disabled:opacity-70';
const labelClass = 'text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1';

interface EditorProps {
  estimate: Estimate | null;
  history: MaterialHistory[];
  activities: Activity[];
  canEdit: boolean;
  onClose: () => void;
}

function EstimateEditor({ estimate, history, activities, canEdit, onClose }: EditorProps) {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState(estimate?.name ?? '');
  const [activityId, setActivityId] = useState(estimate?.activityId ?? '');
  const [waste, setWaste] = useState(String(estimate?.wastePercent ?? 5));
  const [labor, setLabor] = useState(estimate?.laborCost ? String(estimate.laborCost) : '');
  const [items, setItems] = useState<EstimateItem[]>(estimate?.items ?? []);
  const [templateId, setTemplateId] = useState(ESTIMATE_TEMPLATES[0].id);
  const [workQuantity, setWorkQuantity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmBudget, setConfirmBudget] = useState(false);

  useModalHistory(true, onClose);

  const template = ESTIMATE_TEMPLATES.find((t) => t.id === templateId)!;
  const wastePercent = Math.max(0, parseFloat(waste) || 0);
  const totals = computeEstimate(items, wastePercent, parseFloat(labor) || 0, history);
  const activity = activities.find((a) => a.id === activityId);

  const updateItem = (index: number, changes: Partial<EstimateItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  const handleAddTemplate = () => {
    const quantity = parseFloat(workQuantity);
    if (!quantity || quantity <= 0) return setError(`Indica cuántos ${template.unit} vas a hacer`);
    setError('');
    setItems((current) => addTemplateItems(current, template, quantity));
    setWorkQuantity('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !user) return;
    if (!name.trim()) return setError('Ponle un nombre a la estimación');
    if (items.some((i) => !i.name.trim())) return setError('Hay materiales sin nombre');
    setSaving(true);
    setError('');
    try {
      await saveEstimate({
        id: estimate?.id,
        name: name.trim(),
        activityId: activityId || null,
        wastePercent,
        laborCost: parseFloat(labor) || 0,
        items: items.map((i) => ({ ...i, name: i.name.trim(), quantity: i.quantity || 0 })),
      }, user.id);
      toast('Estimación guardada');
      onClose();
    } catch (err) {
      console.error('Error al guardar la estimación:', err);
      setError('Error al guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const applyBudget = async () => {
    if (!activity || saving) return;
    setSaving(true);
    try {
      await updateActivity(activity.id, { estimatedBudget: Math.round(totals.total) });
      toast(`Presupuesto de ${activity.name} actualizado`);
    } catch (err) {
      console.error('Error al actualizar el presupuesto:', err);
      toast('No se pudo actualizar el presupuesto. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSaving(false);
      setConfirmBudget(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Estimación" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSave} className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{estimate ? 'Estimación' : 'Nueva estimación'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}

        <fieldset disabled={!canEdit} className="space-y-4 min-w-0">
          <div>
            <label htmlFor="estimate-name" className={labelClass}>Nombre</label>
            <input id="estimate-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Placa segundo piso" className={inputClass} />
          </div>
          <div>
            <label htmlFor="estimate-activity" className={labelClass}>Actividad (Opcional)</label>
            <select id="estimate-activity" value={activityId} onChange={(e) => setActivityId(e.target.value)} className={inputClass}>
              <option value="">Ninguna</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {canEdit && (
            <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Calcular materiales</p>
              <div className="flex gap-2">
                <select aria-label="Tipo de trabajo" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={cn(inputClass, 'flex-1 min-w-0')}>
                  {ESTIMATE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  aria-label={`Cantidad de trabajo en ${template.unit}`}
                  value={workQuantity}
                  onChange={(e) => setWorkQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTemplate();
                    }
                  }}
                  placeholder={template.unit}
                  className={cn(inputClass, 'w-20 flex-shrink-0')}
                />
                <button type="button" onClick={handleAddTemplate} className="px-3 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors flex-shrink-0">
                  Sumar
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Las cantidades por {template.unit} son de referencia. Ajústalas con tu maestro según la obra.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className={labelClass}>Materiales</p>
            {items.length === 0 && <p className="text-sm text-gray-500 text-center py-3">Aún no hay materiales</p>}
            {items.map((item, index) => {
              const known = findMaterial(item.name, history);
              return (
                <div key={index} className="border border-gray-100 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input aria-label="Material" value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="Material" className={cn(inputClass, 'flex-1 min-w-0')} />
                    {canEdit && (
                      <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} aria-label={`Quitar ${item.name || 'material'}`} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      aria-label="Cantidad"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      placeholder="Cant."
                      className={inputClass}
                    />
                    <input aria-label="Unidad" value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} placeholder="Unidad" className={inputClass} />
                    <AmountInput
                      value={item.unitPrice !== null ? String(item.unitPrice) : ''}
                      onChange={(v) => updateItem(index, { unitPrice: v === '' ? null : parseFloat(v) })}
                      placeholder={known ? new Intl.NumberFormat('es-CO').format(Math.round(known.last.unitPrice)) : 'Precio'}
                      aria-label="Precio unitario"
                      className={inputClass}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.unitPrice !== null
                      ? 'Precio escrito a mano'
                      : known
                        ? `Última compra: ${known.name}, ${format(known.last.date, 'd MMM yyyy', { locale: es })}`
                        : 'Sin compras registradas: escribe un precio'}
                  </p>
                </div>
              );
            })}
            {canEdit && (
              <button
                type="button"
                onClick={() => setItems((current) => [...current, { name: '', unit: '', quantity: 0, unitPrice: null }])}
                className="w-full py-2.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar material
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="estimate-waste" className={labelClass}>Desperdicio %</label>
              <input id="estimate-waste" type="number" min="0" step="any" inputMode="decimal" value={waste} onChange={(e) => setWaste(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mano de obra</label>
              <AmountInput value={labor} onChange={setLabor} placeholder="0" aria-label="Mano de obra" className={inputClass} />
            </div>
          </div>
        </fieldset>

        <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600"><span>Materiales</span><span className="tabular-nums">{formatCurrency(totals.materials)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Desperdicio</span><span className="tabular-nums">{formatCurrency(totals.waste)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Mano de obra</span><span className="tabular-nums">{formatCurrency(totals.labor)}</span></div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200"><span>Total estimado</span><span className="tabular-nums">{formatCurrency(totals.total)}</span></div>
          {totals.missingPrices > 0 && (
            <p className="text-xs text-amber-700 flex items-center gap-1.5 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {totals.missingPrices === 1 ? '1 material sin precio' : `${totals.missingPrices} materiales sin precio`}: el total real será mayor.
            </p>
          )}
        </div>

        {canEdit && (
          <div className="space-y-2">
            <button type="submit" disabled={saving} className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              Guardar estimación
            </button>
            {activity && (
              <button type="button" onClick={() => setConfirmBudget(true)} disabled={saving || totals.total <= 0} className="w-full py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">
                Usar como presupuesto de {activity.name}
              </button>
            )}
          </div>
        )}

      </form>

      <ConfirmDialog
        open={confirmBudget}
        title="¿Cambiar el presupuesto?"
        message={activity ? `${activity.name} pasa de ${formatCurrency(activity.estimatedBudget)} a ${formatCurrency(Math.round(totals.total))}.` : ''}
        confirmLabel="Sí, cambiarlo"
        loading={saving}
        onConfirm={applyBudget}
        onCancel={() => setConfirmBudget(false)}
      />
    </div>
  );
}

export default function Estimator() {
  const goBack = useSmartBack('/obra');
  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role !== 'collaborator';
  const { transactions, loading: dataLoading } = useDashboardData();
  const { activities, loading: constructionLoading } = useConstructionData();
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // undefined: editor cerrado; null: estimación nueva
  const [editing, setEditing] = useState<Estimate | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Estimate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => subscribeEstimates(setEstimates, () => setLoadFailed(true)), []);

  const history = useMemo(() => buildMaterialHistory(transactions), [transactions]);

  const confirmDelete = async () => {
    if (!deleting || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteEstimate(deleting.id);
      toast('Estimación eliminada');
    } catch (error) {
      console.error('Error al eliminar la estimación:', error);
      toast('No se pudo eliminar. Intenta de nuevo.', { type: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
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
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Estimador de costos</h1>
            <p className="text-xs text-gray-500">Con los precios de tus propias compras</p>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-3 max-w-4xl mx-auto">
        {loadFailed ? (
          <p className="text-center text-sm text-red-600 py-12">No se pudieron cargar las estimaciones. Revisa tu conexión y vuelve a intentarlo.</p>
        ) : estimates === null || dataLoading || constructionLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Calculator className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 font-medium">Aún no hay estimaciones</p>
            {history.length === 0 && (
              <p className="text-sm text-gray-400 px-6">Registra compras con "cantidad × precio" para que los precios se llenen solos.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {estimates.map((estimate) => {
              const totals = computeEstimate(estimate.items, estimate.wastePercent, estimate.laborCost, history);
              const activityName = activities.find((a) => a.id === estimate.activityId)?.name;
              return (
                <div key={estimate.id} className="flex items-center">
                  <button onClick={() => setEditing(estimate)} className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{estimate.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {activityName ?? `${estimate.items.length} materiales`}
                        {totals.missingPrices > 0 && <span className="text-amber-700"> · faltan precios</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">{formatCurrency(totals.total)}</p>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                  {canEdit && (
                    <button onClick={() => setDeleting(estimate)} aria-label={`Eliminar ${estimate.name}`} className="p-2.5 mr-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-[18px] h-[18px]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canEdit && (
        <button
          onClick={() => setEditing(null)}
          className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-xl active:scale-95 transition-all z-40 flex items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium text-sm pr-1">Estimar</span>
        </button>
      )}

      {editing !== undefined && (
        <EstimateEditor estimate={editing} history={history} activities={activities} canEdit={canEdit} onClose={() => setEditing(undefined)} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="¿Eliminar estimación?"
        message="No afecta los presupuestos ya aplicados."
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
