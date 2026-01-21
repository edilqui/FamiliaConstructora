import { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const isOnline = navigator.onLine;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">FamiliaBuilder</h1>
            {!isOnline && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="text-sm hidden sm:inline">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-primary-700 rounded-full transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
