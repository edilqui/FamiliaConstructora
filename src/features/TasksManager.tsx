import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { createTask, toggleTaskCompleted, deleteTask, subscribeToUserTasks } from '../services/taskService';
import {
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Task } from '../types';

export default function TasksManager() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState('');

  // Suscripción en tiempo real a las tareas del usuario
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserTasks(user.id, (userTasks) => {
      setTasks(userTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;

    setAddingTask(true);
    setError('');

    try {
      await createTask(newTaskTitle.trim(), user.id);
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

  // Separar tareas completadas y pendientes
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

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
          <p className="text-xs lg:text-sm text-gray-500">Organiza tus recordatorios</p>
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

        {/* --- TAREAS PENDIENTES --- */}
        {!loading && pendingTasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2">
              <Circle className="w-3 h-3" />
              Pendientes ({pendingTasks.length})
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Circle className="w-6 h-6 text-gray-400" />
                  </button>

                  {/* Título */}
                  <p className="flex-1 text-sm text-gray-900 font-medium">
                    {task.title}
                  </p>

                  {/* Botón Eliminar */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAREAS COMPLETADAS --- */}
        {!loading && completedTasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2 flex items-center gap-2">
              <CheckCheck className="w-3 h-3" />
              Completadas ({completedTasks.length})
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                >
                  {/* Checkbox completado */}
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </button>

                  {/* Título tachado */}
                  <p className="flex-1 text-sm text-gray-400 line-through">
                    {task.title}
                  </p>

                  {/* Botón Eliminar */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
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
              Crea tu primera tarea para empezar a organizarte
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
