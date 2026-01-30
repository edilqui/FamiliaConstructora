import { useAuthStore } from '../store/useAuthStore';
import { Clock, LogOut, Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function PendingApproval() {
  const { user, logout, initialize } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Recargar la página para verificar si el usuario fue aprobado
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">

        {/* Icono */}
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-12 h-12 text-amber-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 left-0 right-0 mx-auto w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg" style={{ left: '55%' }}>
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso Pendiente
        </h1>

        <p className="text-gray-600 mb-6">
          Tu cuenta está esperando aprobación de un miembro de la familia.
        </p>

        {/* Info del usuario */}
        {user && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje informativo */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">
                Por seguridad
              </p>
              <p className="text-xs text-amber-700">
                Solo los miembros aprobados de la familia pueden acceder a la aplicación.
                Pide a uno de ellos que apruebe tu acceso desde Configuración.
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-200 active:scale-[0.98]"
          >
            {refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            {refreshing ? 'Verificando...' : 'Ya me aprobaron'}
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          Si crees que esto es un error, contacta a un administrador.
        </p>
      </div>
    </div>
  );
}
