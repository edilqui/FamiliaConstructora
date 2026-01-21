import { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, WifiOff, LayoutDashboard, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const isOnline = navigator.onLine;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
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

          {/* Navigation Tabs */}
          {user && (
            <nav className="flex gap-1 mt-3 -mb-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors',
                      isActive
                        ? 'bg-gray-50 text-primary-600 font-semibold'
                        : 'text-white hover:bg-primary-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
