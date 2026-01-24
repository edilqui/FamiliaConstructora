import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  Settings as SettingsIcon,
  Tag,
  FolderKanban,
  Sliders,
  User,
  Info,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  variant?: 'default' | 'danger';
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const settingsOptions: SettingOption[] = [
    {
      id: 'categories',
      label: 'Gestión de Categorías',
      description: 'Administrar categorías de gastos',
      icon: Tag,
      path: '/settings/categories',
    },
    {
      id: 'projects',
      label: 'Gestión de Proyectos',
      description: 'Administrar proyectos y presupuestos',
      icon: FolderKanban,
      path: '/settings/projects',
    },
    {
      id: 'general',
      label: 'Configuraciones Generales',
      description: 'Ajustes de la aplicación',
      icon: Sliders,
      path: '/settings/general',
    },
    {
      id: 'profile',
      label: 'Perfil de Usuario',
      description: 'Ver y editar tu información',
      icon: User,
      path: '/settings/profile',
    },
    {
      id: 'about',
      label: 'Acerca de',
      description: 'Información de la aplicación',
      icon: Info,
      path: '/settings/about',
    },
    {
      id: 'logout',
      label: 'Cerrar Sesión',
      description: 'Salir de tu cuenta',
      icon: LogOut,
      action: handleLogout,
      variant: 'danger',
    },
  ];

  const handleOptionClick = (option: SettingOption) => {
    if (option.action) {
      option.action();
    } else if (option.path) {
      navigate(option.path);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-full">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm text-gray-600">Ajustes y opciones de la aplicación</p>
        </div>
      </div>

      {/* User Info Card */}
      {user && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-600 rounded-full">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Options */}
      <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
        {settingsOptions.map((option, index) => {
          const Icon = option.icon;
          const isLast = index === settingsOptions.length - 1;
          const isDanger = option.variant === 'danger';

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option)}
              disabled={option.id === 'logout' && loggingOut}
              className={cn(
                'w-full flex items-center gap-4 p-4 transition-colors text-left',
                !isLast && 'border-b border-gray-200',
                isDanger
                  ? 'hover:bg-red-50 active:bg-red-100'
                  : 'hover:bg-gray-50 active:bg-gray-100',
                option.id === 'logout' && loggingOut && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  isDanger ? 'bg-red-100' : 'bg-gray-100'
                )}
              >
                {option.id === 'logout' && loggingOut ? (
                  <Loader2 className={cn('w-5 h-5 animate-spin', isDanger ? 'text-red-600' : 'text-gray-600')} />
                ) : (
                  <Icon className={cn('w-5 h-5', isDanger ? 'text-red-600' : 'text-gray-600')} />
                )}
              </div>

              <div className="flex-1">
                <p className={cn('font-medium', isDanger ? 'text-red-700' : 'text-gray-800')}>
                  {option.label}
                </p>
                <p className={cn('text-sm', isDanger ? 'text-red-600' : 'text-gray-600')}>
                  {option.description}
                </p>
              </div>

              {!isDanger && (
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* App Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          <strong>FamiliaBuilder</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Versión 1.0.0 • Gestión familiar de construcción
        </p>
      </div>
    </div>
  );
}
