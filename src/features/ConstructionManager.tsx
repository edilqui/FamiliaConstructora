import { useState, useMemo, FormEvent } from 'react';
import {
  Building2, HardHat, Plus, ChevronDown, ChevronUp, Edit2, Trash2,
  CheckCircle2, Clock, Circle, X, Loader2, AlertTriangle, TrendingUp,
  DollarSign, PauseCircle, LayoutList,
} from 'lucide-react';
import { useConstructionData } from '../hooks/useConstructionData';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  createStage, updateStage, deleteStage, getNextStageOrder,
} from '../services/stageService';
import {
  createActivity, updateActivity, deleteActivity, getNextActivityOrder,
} from '../services/activityService';
import { formatCurrency, cn } from '../lib/utils';
import type { Stage, Activity, StageStatus, ActivityStatus } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

const STAGE_STATUS_CONFIG: Record<StageStatus, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: 'Pendiente',   color: 'bg-gray-100 text-gray-600',   Icon: Circle       },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700',   Icon: Clock        },
  completed:   { label: 'Completada',  color: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  paused:      { label: 'Pausada',     color: 'bg-yellow-100 text-yellow-700', Icon: PauseCircle },
};

const ACTIVITY_STATUS_CONFIG: Record<ActivityStatus, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: 'Pendiente',   color: 'bg-gray-100 text-gray-600',   Icon: Circle       },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700',   Icon: Clock        },
  completed:   { label: 'Completada',  color: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
};

function StatusBadge({ status, type }: { status: StageStatus | ActivityStatus; type: 'stage' | 'activity' }) {
  const cfg = type === 'stage'
    ? STAGE_STATUS_CONFIG[status as StageStatus]
    : ACTIVITY_STATUS_CONFIG[status as ActivityStatus];
  const Icon = cfg.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max, color = 'bg-orange-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const overBudget = max > 0 && value > max;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={cn('h-2 rounded-full transition-all duration-500', overBudget ? 'bg-red-500' : color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'gestion' | 'progreso';

interface StageFormData {
  name: string;
  projectId: string;
  estimatedBudget: string;
  status: StageStatus;
}

interface ActivityFormData {
  name: string;
  estimatedBudget: string;
  status: ActivityStatus;
  progressPercent: string;
}

const defaultStageForm = (): StageFormData => ({ name: '', projectId: '', estimatedBudget: '', status: 'pending' });
const defaultActivityForm = (): ActivityFormData => ({ name: '', estimatedBudget: '', status: 'pending', progressPercent: '0' });

// ── main component ──────────────────────────────────────────────────────────

export default function ConstructionManager() {
  const { stages, activities, loading } = useConstructionData();
  const { projects, transactions } = useDashboardData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('gestion');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());

  // Stage modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState<StageFormData>(defaultStageForm());
  const [stageError, setStageError] = useState('');
  const [stageSaving, setStageSaving] = useState(false);

  // Activity modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormData>(defaultActivityForm());
  const [activityStageId, setActivityStageId] = useState('');
  const [activityError, setActivityError] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);

  // Delete confirm
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── derived data ──────────────────────────────────────────────────────────

  const spentByActivity = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.activityId) {
        map.set(t.activityId, (map.get(t.activityId) ?? 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  const spentByStage = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.stageId) {
        map.set(t.stageId, (map.get(t.stageId) ?? 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  const filteredStages = useMemo(
    () => selectedProjectId ? stages.filter((s) => s.projectId === selectedProjectId) : stages,
    [stages, selectedProjectId],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active' || p.status === 'paused'),
    [projects],
  );

  // ── handlers: stage ───────────────────────────────────────────────────────

  const openNewStage = () => {
    setEditingStage(null);
    setStageForm({ ...defaultStageForm(), projectId: selectedProjectId });
    setStageError('');
    setShowStageModal(true);
  };

  const openEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setStageForm({
      name: stage.name,
      projectId: stage.projectId,
      estimatedBudget: stage.estimatedBudget > 0 ? stage.estimatedBudget.toString() : '',
      status: stage.status,
    });
    setStageError('');
    setShowStageModal(true);
  };

  const handleSaveStage = async (e: FormEvent) => {
    e.preventDefault();
    setStageError('');
    if (!stageForm.name.trim()) return setStageError('El nombre es requerido.');
    if (!stageForm.projectId) return setStageError('Selecciona un proyecto.');
    setStageSaving(true);
    try {
      const budget = parseFloat(stageForm.estimatedBudget) || 0;
      if (editingStage) {
        await updateStage(editingStage.id, {
          name: stageForm.name.trim(),
          projectId: stageForm.projectId,
          estimatedBudget: budget,
          status: stageForm.status,
          completedAt: stageForm.status === 'completed' ? new Date() : null,
        });
      } else {
        const order = await getNextStageOrder();
        await createStage({
          name: stageForm.name.trim(),
          projectId: stageForm.projectId,
          estimatedBudget: budget,
          status: stageForm.status,
          order,
        });
      }
      setShowStageModal(false);
    } catch {
      setStageError('Error al guardar. Intenta nuevamente.');
    } finally {
      setStageSaving(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const result = await deleteStage(stageId);
      if (!result.success) {
        setDeleteError(result.message);
      } else {
        setDeletingStageId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── handlers: activity ────────────────────────────────────────────────────

  const openNewActivity = (stageId: string) => {
    setEditingActivity(null);
    setActivityStageId(stageId);
    setActivityForm(defaultActivityForm());
    setActivityError('');
    setShowActivityModal(true);
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityStageId(activity.stageId);
    setActivityForm({
      name: activity.name,
      estimatedBudget: activity.estimatedBudget > 0 ? activity.estimatedBudget.toString() : '',
      status: activity.status,
      progressPercent: activity.progressPercent.toString(),
    });
    setActivityError('');
    setShowActivityModal(true);
  };

  const handleSaveActivity = async (e: FormEvent) => {
    e.preventDefault();
    setActivityError('');
    if (!activityForm.name.trim()) return setActivityError('El nombre es requerido.');
    setActivitySaving(true);
    try {
      const budget = parseFloat(activityForm.estimatedBudget) || 0;
      const progress = Math.min(100, Math.max(0, parseInt(activityForm.progressPercent) || 0));
      const stage = stages.find((s) => s.id === activityStageId);
      if (editingActivity) {
        await updateActivity(editingActivity.id, {
          name: activityForm.name.trim(),
          estimatedBudget: budget,
          status: activityForm.status,
          progressPercent: progress,
          completedAt: activityForm.status === 'completed' ? new Date() : null,
        });
      } else {
        const order = await getNextActivityOrder(activityStageId);
        await createActivity({
          name: activityForm.name.trim(),
          stageId: activityStageId,
          projectId: stage?.projectId ?? '',
          estimatedBudget: budget,
          status: activityForm.status,
          progressPercent: progress,
          order,
        });
      }
      setShowActivityModal(false);
    } catch {
      setActivityError('Error al guardar. Intenta nuevamente.');
    } finally {
      setActivitySaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const result = await deleteActivity(activityId);
      if (!result.success) {
        setDeleteError(result.message);
      } else {
        setDeletingActivityId(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleStage = (id: string) => {
    setExpandedStageIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const renderStageCard = (stage: Stage) => {
    const stageActivities = activities.filter((a) => a.stageId === stage.id);
    const stageSpent = spentByStage.get(stage.id) ?? 0;
    const isExpanded = expandedStageIds.has(stage.id);
    const overBudget = stage.estimatedBudget > 0 && stageSpent > stage.estimatedBudget;

    return (
      <div key={stage.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Stage header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-orange-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{stage.name}</h3>
                <p className="text-xs text-gray-400">
                  {projects.find((p) => p.id === stage.projectId)?.name ?? ''}
                </p>
              </div>
            </div>
            <StatusBadge status={stage.status} type="stage" />
          </div>

          {/* Budget row */}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Presupuesto: <span className="font-semibold text-gray-700">{formatCurrency(stage.estimatedBudget)}</span></span>
              <span className={cn('font-semibold', overBudget ? 'text-red-600' : 'text-gray-700')}>
                Gastado: {formatCurrency(stageSpent)}
                {overBudget && ' ⚠'}
              </span>
            </div>
            <ProgressBar value={stageSpent} max={stage.estimatedBudget} />
            <div className="text-right text-xs text-gray-400">
              {stage.estimatedBudget > 0
                ? `${Math.round((stageSpent / stage.estimatedBudget) * 100)}% del presupuesto`
                : 'Sin presupuesto definido'}
            </div>
          </div>

          {/* Actions row */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => toggleStage(stage.id)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {stageActivities.length} actividad{stageActivities.length !== 1 ? 'es' : ''}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => openEditStage(stage)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setDeletingStageId(stage.id); setDeleteError(''); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Activities (expanded) */}
        {isExpanded && (
          <div className="border-t border-gray-100">
            {stageActivities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin actividades. Agrega una.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stageActivities.map((activity) => renderActivityRow(activity))}
              </div>
            )}
            <div className="p-3">
              <button
                onClick={() => openNewActivity(stage.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Actividad
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivityRow = (activity: Activity) => {
    const spent = spentByActivity.get(activity.id) ?? 0;
    const overBudget = activity.estimatedBudget > 0 && spent > activity.estimatedBudget;

    return (
      <div key={activity.id} className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <HardHat className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">{activity.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={activity.status} type="activity" />
            <button onClick={() => openEditActivity(activity)} className="p-1 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => { setDeletingActivityId(activity.id); setDeleteError(''); }} className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 ml-5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(activity.estimatedBudget)} est.</span>
            <span className={cn('font-medium', overBudget ? 'text-red-600' : 'text-gray-600')}>
              {formatCurrency(spent)} gastado{overBudget && ' ⚠'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">Financiero</div>
              <ProgressBar value={spent} max={activity.estimatedBudget} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 mb-0.5">Físico {activity.progressPercent}%</div>
              <ProgressBar value={activity.progressPercent} max={100} color="bg-blue-500" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── progress tab ──────────────────────────────────────────────────────────

  const renderProgressTab = () => {
    const totalEstimated = filteredStages.reduce((s, st) => s + st.estimatedBudget, 0);
    const totalSpent = filteredStages.reduce((s, st) => s + (spentByStage.get(st.id) ?? 0), 0);
    const completedStages = filteredStages.filter((s) => s.status === 'completed').length;
    const allActivities = filteredStages.flatMap((s) => activities.filter((a) => a.stageId === s.id));
    const completedActivities = allActivities.filter((a) => a.status === 'completed').length;
    const avgPhysical = allActivities.length > 0
      ? Math.round(allActivities.reduce((s, a) => s + a.progressPercent, 0) / allActivities.length)
      : 0;

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Presupuesto</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalEstimated)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Gastado: {formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Avance físico</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{avgPhysical}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Promedio actividades</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Etapas</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{completedStages}/{filteredStages.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Completadas</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Actividades</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{completedActivities}/{allActivities.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Completadas</p>
          </div>
        </div>

        {/* Overall budget bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Presupuesto total usado</span>
            <span className={cn(totalSpent > totalEstimated ? 'text-red-600' : 'text-gray-900')}>
              {totalEstimated > 0 ? `${Math.round((totalSpent / totalEstimated) * 100)}%` : '—'}
            </span>
          </div>
          <ProgressBar value={totalSpent} max={totalEstimated} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatCurrency(totalSpent)} gastado</span>
            <span>{formatCurrency(Math.max(0, totalEstimated - totalSpent))} restante</span>
          </div>
        </div>

        {/* Per-stage breakdown */}
        {filteredStages.map((stage) => {
          const stageActivities = activities.filter((a) => a.stageId === stage.id);
          const stageSpent = spentByStage.get(stage.id) ?? 0;
          const stageAvgPhysical = stageActivities.length > 0
            ? Math.round(stageActivities.reduce((s, a) => s + a.progressPercent, 0) / stageActivities.length)
            : 0;

          return (
            <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-gray-900">{stage.name}</span>
                  </div>
                  <StatusBadge status={stage.status} type="stage" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-400 mb-1">Financiero</div>
                    <ProgressBar value={stageSpent} max={stage.estimatedBudget} />
                    <div className="flex justify-between text-gray-500 mt-1">
                      <span>{formatCurrency(stageSpent)}</span>
                      <span>de {formatCurrency(stage.estimatedBudget)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Físico promedio: {stageAvgPhysical}%</div>
                    <ProgressBar value={stageAvgPhysical} max={100} color="bg-blue-500" />
                  </div>
                </div>
              </div>

              {stageActivities.map((activity) => {
                const spent = spentByActivity.get(activity.id) ?? 0;
                return (
                  <div key={activity.id} className="px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-700">{activity.name}</span>
                      </div>
                      <StatusBadge status={activity.status} type="activity" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <ProgressBar value={spent} max={activity.estimatedBudget} />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>{formatCurrency(spent)}</span>
                          <span>{formatCurrency(activity.estimatedBudget)}</span>
                        </div>
                      </div>
                      <div>
                        <ProgressBar value={activity.progressPercent} max={100} color="bg-blue-400" />
                        <div className="text-[10px] text-gray-400 mt-0.5 text-right">{activity.progressPercent}% físico</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ── main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Avance de Obra</h1>
          </div>
          {activeTab === 'gestion' && (
            <button
              onClick={openNewStage}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors active:scale-95 shadow-sm shadow-orange-200"
            >
              <Plus className="w-4 h-4" />
              Nueva Etapa
            </button>
          )}
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-4 max-w-7xl mx-auto space-y-4">

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('gestion')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl transition-all',
              activeTab === 'gestion' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <LayoutList className="w-4 h-4" />
            Gestión
          </button>
          <button
            onClick={() => setActiveTab('progreso')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl transition-all',
              activeTab === 'progreso' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <TrendingUp className="w-4 h-4" />
            Progreso
          </button>
        </div>

        {/* Project filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedProjectId('')}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              !selectedProjectId ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300',
            )}
          >
            Todos
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                selectedProjectId === p.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : activeTab === 'gestion' ? (
          <div className="space-y-3">
            {filteredStages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-gray-500 font-medium">No hay etapas</p>
                <p className="text-sm text-gray-400">Crea la primera etapa de tu obra.</p>
                <button onClick={openNewStage} className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold text-sm">
                  <Plus className="w-4 h-4" /> Nueva Etapa
                </button>
              </div>
            ) : (
              filteredStages.map(renderStageCard)
            )}
          </div>
        ) : (
          renderProgressTab()
        )}
      </div>

      {/* ── Stage Modal ── */}
      {showStageModal && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStageModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-900">{editingStage ? 'Editar Etapa' : 'Nueva Etapa'}</h2>
              <button onClick={() => setShowStageModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSaveStage} className="p-6 space-y-4">
              {stageError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {stageError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Nombre de la Etapa</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  placeholder="Ej: Plancha segundo nivel"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Proyecto</label>
                <select
                  value={stageForm.projectId}
                  onChange={(e) => setStageForm({ ...stageForm, projectId: e.target.value })}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                  required
                >
                  <option value="">Seleccionar proyecto...</option>
                  {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Presupuesto Estimado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stageForm.estimatedBudget}
                    onChange={(e) => setStageForm({ ...stageForm, estimatedBudget: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Estado</label>
                <select
                  value={stageForm.status}
                  onChange={(e) => setStageForm({ ...stageForm, status: e.target.value as StageStatus })}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="paused">Pausada</option>
                  <option value="completed">Completada</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={stageSaving}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {stageSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {editingStage ? 'Guardar Cambios' : 'Crear Etapa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Activity Modal ── */}
      {showActivityModal && (
        <div className="fixed inset-0 bottom-20 sm:bottom-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowActivityModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-900">{editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
              <button onClick={() => setShowActivityModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              {activityError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {activityError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Nombre de la Actividad</label>
                <input
                  type="text"
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  placeholder="Ej: Columnas, Encofrado, Fundir..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Presupuesto Estimado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={activityForm.estimatedBudget}
                    onChange={(e) => setActivityForm({ ...activityForm, estimatedBudget: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Avance Físico: {activityForm.progressPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={activityForm.progressPercent}
                  onChange={(e) => setActivityForm({ ...activityForm, progressPercent: e.target.value })}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 ml-1">Estado</label>
                <select
                  value={activityForm.status}
                  onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value as ActivityStatus })}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none font-medium"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completada</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={activitySaving}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {activitySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardHat className="w-4 h-4" />}
                {editingActivity ? 'Guardar Cambios' : 'Crear Actividad'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Stage Confirm ── */}
      {deletingStageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingStageId(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¿Eliminar etapa?</h3>
            <p className="text-sm text-gray-500">Primero debes eliminar todas sus actividades.</p>
            {deleteError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeletingStageId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Cancelar</button>
              <button
                onClick={() => handleDeleteStage(deletingStageId)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Activity Confirm ── */}
      {deletingActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingActivityId(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¿Eliminar actividad?</h3>
            <p className="text-sm text-gray-500">No podrá eliminarse si tiene gastos asociados.</p>
            {deleteError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeletingActivityId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Cancelar</button>
              <button
                onClick={() => handleDeleteActivity(deletingActivityId)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
