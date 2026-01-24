import { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, WifiOff } from 'lucide-react';
import BottomNav from './BottomNav';

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
      {/* Navbar Superior */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold">FamiliaBuilder</h1>
              {!isOnline && (
                <span className="flex items-center gap-1 text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden xs:inline">Offline</span>
                </span>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm hidden sm:inline truncate max-w-[100px] md:max-w-none">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 hover:bg-primary-700 rounded-full transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl pb-20 sm:pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      {user && <BottomNav />}
    </div>
  );
}
