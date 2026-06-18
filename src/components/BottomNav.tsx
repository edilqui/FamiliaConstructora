import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Wallet, Scale, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/',           label: 'Inicio',      icon: Home     },
  { path: '/expenses',   label: 'Movimientos', icon: Wallet   },
  { path: '/balance',    label: 'Balance',     icon: Scale    },
  { path: '/statistics', label: 'Reportes',    icon: BarChart3 },
  { path: '/settings',   label: 'Ajustes',     icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] z-50 safe-area-inset-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around items-end h-16 sm:h-[4.5rem] px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-end flex-1 pb-2 h-full pt-1 transition-colors"
              >
                {/* Pill del ícono activo */}
                <div className={cn(
                  'flex items-center justify-center rounded-2xl transition-all duration-200',
                  isActive
                    ? 'bg-emerald-100 w-14 h-7 mb-0.5'
                    : 'w-7 h-7 mb-0.5',
                )}>
                  <Icon className={cn(
                    'transition-all duration-200',
                    isActive
                      ? 'w-5 h-5 text-emerald-700'
                      : 'w-6 h-6 text-gray-400',
                  )} />
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[10px] sm:text-xs font-medium leading-tight transition-colors duration-200',
                  isActive ? 'text-emerald-700 font-semibold' : 'text-gray-400',
                )}>
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
