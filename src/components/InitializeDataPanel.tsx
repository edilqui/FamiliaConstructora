import { useState } from 'react';
import { initializeProjects, initializeCategories, addInitialContribution } from '../services/initializeData';
import { useAuthStore } from '../store/useAuthStore';
import { Database, Loader2, CheckCircle, XCircle, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

export default function InitializeDataPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const user = useAuthStore((state) => state.user);

  const handleInitializeProjects = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    const result = await initializeProjects();

    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    setLoading(false);
  };

  const handleInitializeCategories = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    const result = await initializeCategories();

    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    setLoading(false);
  };

  const handleAddContribution = async () => {
    if (!user) {
      setMessage('❌ Debes iniciar sesión para agregar un aporte');
      setMessageType('error');
      return;
    }

    const amount = prompt('¿Cuánto quieres aportar inicialmente?');
    if (!amount || isNaN(parseFloat(amount))) {
      setMessage('❌ Monto inválido');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    const result = await addInitialContribution(
      user.id,
      parseFloat(amount),
      'Aporte inicial'
    );

    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500 rounded-full">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Inicializar Datos</h3>
          <p className="text-sm text-gray-600">Primera configuración del sistema</p>
        </div>
      </div>

      {/* Mensaje de resultado */}
      {message && (
        <div
          className={cn(
            'mb-4 p-3 rounded-lg flex items-start gap-2',
            messageType === 'success' && 'bg-green-50 border border-green-200 text-green-800',
            messageType === 'error' && 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Botones */}
      <div className="space-y-3">
        <button
          onClick={handleInitializeProjects}
          disabled={loading}
          className={cn(
            'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creando proyectos...
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              Crear Proyectos Iniciales
            </>
          )}
        </button>

        <button
          onClick={handleInitializeCategories}
          disabled={loading}
          className={cn(
            'w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creando categorías...
            </>
          ) : (
            <>
              <Tag className="w-5 h-5" />
              Crear Categorías
            </>
          )}
        </button>

        <button
          onClick={handleAddContribution}
          disabled={loading}
          className={cn(
            'w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          Agregar Mi Aporte Inicial
        </button>
      </div>

      {/* Instrucciones */}
      <div className="mt-4 p-3 bg-white rounded border border-blue-100">
        <p className="text-xs text-gray-600">
          <strong>Instrucciones:</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
          <li>Haz clic en "Crear Proyectos Iniciales" primero</li>
          <li>Si no ves categorías, haz clic en "Crear Categorías"</li>
          <li>Luego, cada hermano puede agregar su aporte inicial</li>
        </ul>
      </div>
    </div>
  );
}
