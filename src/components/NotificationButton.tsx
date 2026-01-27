import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

export default function NotificationButton() {
  const [showPanel, setShowPanel] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />

        {/* Indicador de notificaciones no leídas */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
      />
    </>
  );
}
