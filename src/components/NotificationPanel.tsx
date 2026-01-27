import { createPortal } from 'react-dom'; // <--- 1. Importar esto
import { Bell, X, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatCurrency } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Si no está abierto, no renderizamos nada
  if (!isOpen) return null;

  // --- Helper seguro para fechas (Mantenemos esto por seguridad) ---
  const safeDate = (dateInput: any) => {
    try {
      if (!dateInput) return new Date();
      if (typeof dateInput.toDate === 'function') return dateInput.toDate(); // Firestore
      if (typeof dateInput === 'string') return new Date(dateInput);
      return dateInput;
    } catch (e) {
      return new Date();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution_created': return '💰';
      case 'expense_created': return '📤';
      case 'transaction_edited': return '✏️';
      case 'transaction_deleted': return '🗑️';
      default: return '📬';
    }
  };

  // --- 2. Usamos createPortal para "teletransportar" el HTML al body ---
  return createPortal(
    <div className="relative z-[9999]"> {/* Z-Index alto para ganar al Header */}
      
      {/* Overlay (Fondo oscuro) */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel Deslizante */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header del Panel */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Notificaciones</h2>
              <p className="text-xs text-blue-100">
                {unreadCount === 0 ? 'No tienes notificaciones' : `${unreadCount} nuevas`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botón de marcar leídas */}
        {unreadCount > 0 && (
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              onClick={() => markAllAsRead()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Lista de Contenido (Scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-gray-50 transition-colors group relative"
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {notification.message}
                      </p>

                      {notification.transactionDescription && (
                        <p className="text-xs text-gray-600 mb-1">
                          {notification.transactionDescription}
                          {notification.amount && (
                            <span className="font-semibold ml-1">
                              • {formatCurrency(notification.amount)}
                            </span>
                          )}
                        </p>
                      )}

                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(safeDate(notification.createdAt), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body // <--- Aquí indicamos que se renderice en el <body>
  );
}