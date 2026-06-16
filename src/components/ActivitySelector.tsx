import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import type { Stage, Activity } from '../types';
import { cn } from '../lib/utils';

interface ActivitySelectorProps {
  stages: Stage[];
  activities: Activity[];
  selectedStageId: string;
  selectedActivityId: string;
  onStageChange: (stageId: string, stageName: string) => void;
  onActivityChange: (activityId: string, activityName: string) => void;
  projectId?: string;
}

export default function ActivitySelector({
  stages,
  activities,
  selectedStageId,
  selectedActivityId,
  onStageChange,
  onActivityChange,
  projectId,
}: ActivitySelectorProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const visibleStages = stages.filter((s) => {
    if (projectId && s.projectId !== projectId) return false;
    if (!showCompleted && s.status === 'completed') return false;
    return true;
  });

  const visibleActivities = activities.filter((a) => {
    if (a.stageId !== selectedStageId) return false;
    if (!showCompleted && a.status === 'completed') return false;
    return true;
  });

  const handleStageChange = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    onStageChange(stageId, stage?.name ?? '');
    onActivityChange('', '');
  };

  const handleActivityChange = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    onActivityChange(activityId, activity?.name ?? '');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-orange-600">Solo etapas/actividades activas</span>
        <button
          type="button"
          onClick={() => setShowCompleted(!showCompleted)}
          className={cn(
            'flex items-center gap-1 text-xs font-medium transition-colors',
            showCompleted ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Eye className="w-3 h-3" />
          {showCompleted ? 'Ocultando completadas' : 'Ver completadas'}
        </button>
      </div>

      {/* Selector de Etapa */}
      <div className="relative">
        <select
          value={selectedStageId}
          onChange={(e) => handleStageChange(e.target.value)}
          className="w-full appearance-none bg-orange-50 border border-orange-200 text-gray-900 text-sm rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none font-medium"
        >
          <option value="">Seleccionar etapa...</option>
          {visibleStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.status === 'completed' ? '✓' : s.status === 'in_progress' ? '●' : '○'}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
      </div>

      {/* Selector de Actividad */}
      {selectedStageId && (
        <div className="relative">
          <select
            value={selectedActivityId}
            onChange={(e) => handleActivityChange(e.target.value)}
            className="w-full appearance-none bg-orange-50 border border-orange-200 text-gray-900 text-sm rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none font-medium"
          >
            <option value="">Seleccionar actividad...</option>
            {visibleActivities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.status === 'completed' ? '✓' : a.status === 'in_progress' ? '●' : '○'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
          {visibleActivities.length === 0 && (
            <p className="text-xs text-gray-400 mt-1 ml-1">
              No hay actividades {showCompleted ? '' : 'activas '}en esta etapa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
