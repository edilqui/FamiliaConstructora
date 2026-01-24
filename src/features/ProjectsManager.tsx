import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Play,
  Pause,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import {
  createProject,
  updateProject,
  deleteProject,
  getAllProjectsStats,
  updateProjectStatus
} from '../services/projectService';
import type { Project } from '../types';

interface ProjectFormData {
  id?: string;
  name: string;
  budget: number;
  status: 'active' | 'paused' | 'completed';
}

interface ProjectStats {
  totalSpent: number;
  transactionCount: number;
  contributionCount: number;
  expenseCount: number;
}

export default function ProjectsManager() {
  const navigate = useNavigate();
  const { projects } = useDashboardData();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    budget: 0,
    status: 'active',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [projectsStats, setProjectsStats] = useState<Map<string, ProjectStats>>(new Map());
  const [loadingStats, setLoadingStats] = useState(true);

  // Cargar estadísticas de proyectos
  useEffect(() => {
    const loadProjectsStats = async () => {
      setLoadingStats(true);
      try {
        const stats = await getAllProjectsStats(projects);
        setProjectsStats(stats);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (projects.length > 0) {
      loadProjectsStats();
    } else {
      setLoadingStats(false);
    }
  }, [projects]);

  const handleOpenCreateForm = () => {
    setFormData({ name: '', budget: 0, status: 'active' });
    setIsEditing(false);
    setShowForm(true);
    setMessage('');
  };

  const handleOpenEditForm = (project: Project) => {
    setFormData({
      id: project.id,
      name: project.name,
      budget: project.budget,
      status: project.status,
    });
    setIsEditing(true);
    setShowForm(true);
    setMessage('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', budget: 0, status: 'active' });
    setIsEditing(false);
    setMessage('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!formData.name.trim()) {
      setMessage('El nombre es requerido');
      setMessageType('error');
      return;
    }

    if (formData.budget < 0) {
      setMessage('El presupuesto no puede ser negativo');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && formData.id) {
        await updateProject({
          id: formData.id,
          name: formData.name.trim(),
          budget: formData.budget,
          status: formData.status,
        });
        setMessage('Proyecto actualizado exitosamente');
      } else {
        await createProject({
          name: formData.name.trim(),
          budget: formData.budget,
          status: formData.status,
        });
        setMessage('Proyecto creado exitosamente');
      }

      setMessageType('success');
      setTimeout(() => {
        handleCloseForm();
        setMessage('');
      }, 1500);
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
      setMessage('Error al guardar. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el proyecto "${project.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await deleteProject(project.id);

      if (result.success) {
        setMessage(result.message);
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message);
        setMessageType('error');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      setMessage('Error al eliminar. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (projectId: string, newStatus: 'active' | 'paused' | 'completed') => {
    setLoading(true);
    setMessage('');

    try {
      await updateProjectStatus(projectId, newStatus);
      setMessage('Estado actualizado exitosamente');
      setMessageType('success');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      setMessage('Error al cambiar estado. Intenta nuevamente.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Activo',
          icon: Play,
          color: 'text-green-600',
          bg: 'bg-green-100',
          border: 'border-green-300',
        };
      case 'paused':
        return {
          label: 'Pausado',
          icon: Pause,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          border: 'border-yellow-300',
        };
      case 'completed':
        return {
          label: 'Completado',
          icon: CheckCircle,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          border: 'border-blue-300',
        };
      default:
        return {
          label: status,
          icon: FolderKanban,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          border: 'border-gray-300',
        };
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-blue-100 rounded-full">
            <FolderKanban className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Proyectos</h1>
            <p className="text-sm text-gray-600">Gestionar proyectos y presupuestos</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'p-3 rounded-lg flex items-start gap-2',
            messageType === 'success' && 'bg-green-50 border border-green-200 text-green-800',
            messageType === 'error' && 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {messageType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">No hay proyectos</p>
            <p className="text-sm text-gray-400">Crea el primer proyecto para comenzar</p>
          </div>
        ) : (
          projects.map((project) => {
            const stats = projectsStats.get(project.id);
            const statusConfig = getStatusConfig(project.status);
            const StatusIcon = statusConfig.icon;
            const canDelete = (stats?.transactionCount || 0) === 0;
            const percentSpent = project.budget > 0 ? (stats?.totalSpent || 0) / project.budget * 100 : 0;

            return (
              <div
                key={project.id}
                className={cn(
                  'bg-white border-2 rounded-lg p-4 transition-colors',
                  statusConfig.border
                )}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn('p-2 rounded-lg', statusConfig.bg)}>
                        <FolderKanban className={cn('w-5 h-5', statusConfig.color)} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800">{project.name}</p>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.bg, statusConfig.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </div>

                        {loadingStats ? (
                          <p className="text-sm text-gray-400">Cargando estadísticas...</p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              Presupuesto: <strong className="text-gray-800">{formatCurrency(project.budget)}</strong>
                            </p>
                            {stats && (
                              <>
                                <p className="text-sm text-gray-600">
                                  Gastado: <strong className={cn(percentSpent > 100 ? 'text-red-600' : 'text-gray-800')}>
                                    {formatCurrency(stats.totalSpent)}
                                  </strong>
                                  {project.budget > 0 && (
                                    <span className="text-xs ml-1">
                                      ({percentSpent.toFixed(1)}%)
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {stats.transactionCount === 0 ? (
                                    <span className="text-gray-400">Sin transacciones</span>
                                  ) : (
                                    <>
                                      {stats.expenseCount} gasto{stats.expenseCount !== 1 ? 's' : ''} • {stats.contributionCount} aporte{stats.contributionCount !== 1 ? 's' : ''}
                                    </>
                                  )}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(project)}
                        disabled={loading}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(project)}
                        disabled={loading || !canDelete || loadingStats}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          canDelete && !loadingStats
                            ? 'hover:bg-red-50 text-red-600'
                            : 'text-gray-300 cursor-not-allowed'
                        )}
                        aria-label="Eliminar"
                        title={!canDelete ? 'No se puede eliminar porque tiene transacciones' : 'Eliminar'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {project.budget > 0 && stats && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            percentSpent > 100 ? 'bg-red-500' : percentSpent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                      {percentSpent > 100 && (
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ Presupuesto excedido en {formatCurrency(stats.totalSpent - project.budget)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status Change Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleChangeStatus(project.id, 'active')}
                      disabled={loading || project.status === 'active'}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        project.status === 'active'
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                      )}
                    >
                      <Play className="w-4 h-4" />
                      Activo
                    </button>

                    <button
                      onClick={() => handleChangeStatus(project.id, 'paused')}
                      disabled={loading || project.status === 'paused'}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        project.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-700 cursor-default'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300'
                      )}
                    >
                      <Pause className="w-4 h-4" />
                      Pausado
                    </button>

                    <button
                      onClick={() => handleChangeStatus(project.id, 'completed')}
                      disabled={loading || project.status === 'completed'}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        project.status === 'completed'
                          ? 'bg-blue-100 text-blue-700 cursor-default'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Completado
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Solo puedes eliminar proyectos sin transacciones</li>
              <li>El presupuesto es opcional (0 = sin límite)</li>
              <li>Puedes cambiar el estado del proyecto en cualquier momento</li>
              <li>La barra de progreso muestra el % gastado del presupuesto</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAB - Add Project */}
      <button
        onClick={handleOpenCreateForm}
        className="fixed bottom-20 sm:bottom-24 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2 group"
        aria-label="Agregar Proyecto"
      >
        <Plus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
          Nuevo Proyecto
        </span>
      </button>

      {/* Modal - Create/Edit Project */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-full">
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Nombre */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Construcción de Apartamentos"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              {/* Presupuesto */}
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Presupuesto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">$</span>
                  <input
                    id="budget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa 0 si no quieres establecer un presupuesto límite
                </p>
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado del Proyecto
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>{isEditing ? 'Actualizar' : 'Crear Proyecto'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
