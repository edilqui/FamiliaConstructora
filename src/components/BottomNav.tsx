import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Wallet, Scale, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Inicio',
    icon: Home,
  },
  {
    path: '/expenses',
    label: 'Movimientos',
    icon: Wallet,
  },
  {
    path: '/balance',
    label: 'Balance',
    icon: Scale,
  },
  {
    path: '/statistics',
    label: 'Estadísticas',
    icon: BarChart3,
  },
  {
    path: '/settings',
    label: 'Ajustes',
    icon: Settings,
  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around items-center h-16 sm:h-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-50'
                )}
              >
                {/* Indicador superior para página activa */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-1 bg-primary-600 rounded-b-full transition-all" />
                )}

                {/* Icono */}
                <Icon className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 mb-1 transition-transform',
                  isActive && 'scale-110'
                )} />

                {/* Label */}
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium transition-all',
                    isActive && 'font-semibold'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
