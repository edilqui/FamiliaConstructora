import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Banner global de sin conexión (renderizado en Layout, visible en todas las
 * pantallas). Firestore guarda los cambios localmente y los sincroniza al
 * volver la red, y este banner lo hace explícito.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[75] bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      Sin conexión — tus cambios se guardarán y sincronizarán al reconectar
    </div>
  );
}
