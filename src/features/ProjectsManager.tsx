import { useState, useEffect, FormEvent, useMemo } from 'react';
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
  Search,
  Banknote,
  TrendingUp,
  Receipt,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import {
  createProject,
  updateProject,
  deleteProject,
  getAllProjectsStats
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

  // Estados
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({ name: '', budget: 0, status: 'active' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Feedback
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Stats
  const [projectsStats, setProjectsStats] = useState<Map<string, ProjectStats>>(new Map());
  const [loadingStats, setLoadingStats] = useState(true);

  // Cargar estadísticas
  useEffect(() => {
    const loadProjectsStats = async () => {
      setLoadingStats(true);
      try {
        const stats = await getAllProjectsStats(projects);
        setProjectsStats(stats);
      } catch (error) {
        console.error('Error stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    if (projects.length > 0) loadProjectsStats();
    else setLoadingStats(false);
  }, [projects]);

  // Filtrar Proyectos
  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  // --- HANDLERS ---
  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleOpenCreateForm = () => {
    setFormData({ name: '', budget: 0, status: 'active' });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEditForm = (project: Project) => {
    setFormData({ ...project });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', budget: 0, status: 'active' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showFeedback('Nombre requerido', 'error');

    setLoading(true);
    try {
      if (isEditing && formData.id) {
        await updateProject({ ...formData, id: formData.id });
        showFeedback('Proyecto actualizado', 'success');
      } else {
        await createProject(formData);
        showFeedback('Proyecto creado', 'success');
      }
      setTimeout(handleCloseForm, 500);
    } catch (error) {
      showFeedback('Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`¿Eliminar proyecto "${project.name}"?`)) return;
    setLoading(true);
    try {
      const result = await deleteProject(project.id);
      if (result.success) showFeedback(result.message, 'success');
      else showFeedback(result.message, 'error');
    } catch (error) {
      showFeedback('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper para estilos de estado
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-100', text: 'text-green-700', icon: PlayCircle, label: 'Activo' };
      case 'paused': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: PauseCircle, label: 'Pausado' };
      case 'completed': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: StopCircle, label: 'Terminado' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: FolderKanban, label: status };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Proyectos</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
          />
        </div>
      </header>

      {/* --- TOAST --- */}
      {message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] max-w-sm">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl shadow-lg border text-sm font-medium",
            messageType === 'success' ? "bg-white border-green-200 text-green-700" : "bg-white border-red-200 text-red-700"
          )}>
            {messageType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message}
          </div>
        </div>
      )}

      {/* --- LISTA DE PROYECTOS --- */}
      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <FolderKanban className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No se encontraron resultados' : 'Crea tu primer proyecto'}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const stats = projectsStats.get(project.id);
            const statusStyle = getStatusStyles(project.status);
            const StatusIcon = statusStyle.icon;
            
            // Cálculos
            const totalSpent = stats?.totalSpent || 0;
            const budget = project.budget;
            const hasBudget = budget > 0;
            const percentSpent = hasBudget ? (totalSpent / budget) * 100 : 0;
            const isOverBudget = hasBudget && totalSpent > budget;
            const canDelete = (stats?.transactionCount || 0) === 0;

            return (
              <div 
                key={project.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md"
              >
                {/* Cabecera Tarjeta */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-xl h-fit">
                      <FolderKanban className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{project.name}</h3>
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mt-1",
                        statusStyle.bg, statusStyle.text
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusStyle.label}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenEditForm(project)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {canDelete && !loadingStats && (
                      <button 
                        onClick={() => handleDelete(project)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas Financieras */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-medium">Ejecutado</span>
                    <span className={cn(
                      "text-lg font-bold",
                      isOverBudget ? "text-red-600" : "text-gray-900"
                    )}>
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  {hasBudget ? (
                    <div className="space-y-1.5">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            percentSpent > 100 ? "bg-red-500" : percentSpent > 80 ? "bg-amber-500" : "bg-blue-500"
                          )}
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase">
                        <span>{percentSpent.toFixed(0)}% Gastado</span>
                        <span>Presupuesto: {formatCurrency(budget)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      <TrendingUp className="w-3 h-3" /> Sin límite de presupuesto
                    </div>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="flex gap-4 text-xs text-gray-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{stats?.expenseCount || 0} gastos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>{stats?.contributionCount || 0} aportes</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- FAB --- */}
      <button
        onClick={handleOpenCreateForm}
        className="fixed bottom-20 right-6 bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-xl active:scale-95 transition-all z-40 flex items-center gap-2"
      >
        <Plus className="w-6 h-6" />
        <span className="font-medium text-sm pr-1">Nuevo</span>
      </button>

      {/* --- MODAL --- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-800">
                {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button onClick={handleCloseForm} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Remodelación Baño"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Presupuesto</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Pon 0 para presupuesto ilimitado</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Estado</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'active', label: 'Activo', icon: PlayCircle },
                    { val: 'paused', label: 'Pausa', icon: PauseCircle },
                    { val: 'completed', label: 'Fin', icon: CheckCircle2 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFormData({...formData, status: opt.val as any})}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                        formData.status === opt.val 
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <opt.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={handleCloseForm} className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}