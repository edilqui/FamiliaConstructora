import { useState, useEffect, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { createTask, toggleTaskCompleted, deleteTask, subscribeToAllTasks, updateTaskTitle } from '../services/taskService';
import {
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  CheckCheck,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Calendar
} from 'lucide-react';
import type { Task } from '../types';

// Función para formatear fecha como "Hoy", "Ayer", o fecha completa
const formatDateGroup = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Hoy';
  if (isYesterday) return 'Ayer';

  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

// Agrupar tareas por fecha
const groupTasksByDate = (tasks: Task[]): Map<string, Task[]> => {
  const groups = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const dateKey = task.createdAt.toDateString();
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, task]);
  });

  return groups;
};

export default function TasksManager() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState('');

  // Estado para edición
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Suscripción en tiempo real a todas las tareas
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAllTasks((allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Focus en el input de edición cuando se activa
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;

    setAddingTask(true);
    setError('');

    try {
      await createTask(newTaskTitle.trim(), user.id, user.name);
      setNewTaskTitle('');
    } catch (err) {
      setError('Error al crear la tarea. Intenta nuevamente.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await toggleTaskCompleted(taskId, !currentCompleted);
    } catch (err) {
      console.error('Error al actualizar tarea:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editingTitle.trim()) return;

    setSavingEdit(true);
    try {
      await updateTaskTitle(editingTaskId, editingTitle.trim());
      setEditingTaskId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Error al actualizar título:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Separar tareas completadas y pendientes
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Agrupar tareas pendientes por fecha
  const pendingByDate = groupTasksByDate(pendingTasks);
  const completedByDate = groupTasksByDate(completedTasks);

  // Componente de tarea individual
  const TaskItem = ({ task, isCompleted }: { task: Task; isCompleted: boolean }) => {
    const isEditing = editingTaskId === task.id;

    return (
      <div className="p-4 flex flex-col gap-2 hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <button
            onClick={() => handleToggleTask(task.id, task.completed)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400" />
            )}
          </button>

          {/* Título o Input de edición */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                ref={editInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={savingEdit}
              />
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editingTitle.trim()}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={cancelEditing}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <p className={`flex-1 text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
                {task.title}
              </p>

              {/* Botón Editar */}
              {!isCompleted && (
                <button
                  onClick={() => startEditing(task)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {/* Botón Eliminar */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Creador de la tarea - dato secundario sutil */}
        {!isEditing && (
          <div className="ml-10 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span>{task.createdByName}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-xs lg:text-sm text-gray-500">Organiza los recordatorios del grupo</p>
        </div>
        <div className="p-2 bg-blue-100 rounded-full">
          <ListTodo className="w-5 h-5 text-blue-600" />
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-6 max-w-3xl mx-auto space-y-6">

        {/* --- FORMULARIO DE NUEVA TAREA --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <form onSubmit={handleAddTask} className="flex gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Escribe una nueva tarea..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              disabled={addingTask}
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addingTask ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </form>

          {error && (
            <div className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* --- LOADING --- */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* --- TAREAS PENDIENTES AGRUPADAS POR FECHA --- */}
        {!loading && pendingTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 flex items-center gap-2">
              <Circle className="w-3 h-3" />
              Pendientes ({pendingTasks.length})
            </h2>

            {Array.from(pendingByDate.entries()).map(([dateKey, dateTasks]) => (
              <div key={dateKey}>
                {/* Fecha del grupo */}
                <div className="flex items-center gap-2 mb-2 ml-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 capitalize">
                    {formatDateGroup(dateTasks[0].createdAt)}
                  </span>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
                  {dateTasks.map((task) => (
                    <TaskItem key={task.id} task={task} isCompleted={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAREAS COMPLETADAS AGRUPADAS POR FECHA --- */}
        {!loading && completedTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 flex items-center gap-2">
              <CheckCheck className="w-3 h-3" />
              Completadas ({completedTasks.length})
            </h2>

            {Array.from(completedByDate.entries()).map(([dateKey, dateTasks]) => (
              <div key={dateKey}>
                {/* Fecha del grupo */}
                <div className="flex items-center gap-2 mb-2 ml-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 capitalize">
                    {formatDateGroup(dateTasks[0].createdAt)}
                  </span>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
                  {dateTasks.map((task) => (
                    <TaskItem key={task.id} task={task} isCompleted={true} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- ESTADO VACÍO --- */}
        {!loading && tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay tareas</h3>
            <p className="text-sm text-gray-500">
              Crea la primera tarea para empezar a organizar al grupo
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
