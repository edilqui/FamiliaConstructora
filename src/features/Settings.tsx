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
  Loader2,
  Shield,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  color: string; // Nuevo: Para el fondo del icono
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

  // Definimos las opciones agrupadas para mejor organización visual
  const managementOptions: SettingOption[] = [
    {
      id: 'categories',
      label: 'Categorías de Gastos',
      icon: Tag,
      path: '/settings/categories',
      color: 'bg-blue-500',
    },
    {
      id: 'projects',
      label: 'Proyectos y Obras',
      icon: FolderKanban,
      path: '/settings/projects',
      color: 'bg-orange-500',
    },
  ];

  const appOptions: SettingOption[] = [
    {
      id: 'general',
      label: 'Preferencias',
      icon: Sliders,
      path: '/settings/general',
      color: 'bg-gray-500',
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: User,
      path: '/settings/profile',
      color: 'bg-purple-500',
    },
    {
      id: 'security', // Un extra visual para rellenar
      label: 'Seguridad',
      icon: Shield,
      path: '/settings/security',
      color: 'bg-emerald-500',
    },
    {
      id: 'about',
      label: 'Acerca de',
      icon: Info,
      path: '/settings/about',
      color: 'bg-indigo-500',
    },
  ];

  const renderOptionRow = (option: SettingOption, isLast: boolean) => {
    const Icon = option.icon;
    const isDanger = option.variant === 'danger';

    return (
      <button
        key={option.id}
        onClick={() => {
          if (option.action) option.action();
          else if (option.path) navigate(option.path);
        }}
        disabled={option.id === 'logout' && loggingOut}
        className={cn(
          "w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors group",
          !isLast && "border-b border-gray-100" // Divisor sutil
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icono con fondo de color estilo iOS */}
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
            isDanger ? "bg-red-100 text-red-600" : option.color
          )}>
            {option.id === 'logout' && loggingOut ? (
              <Loader2 className={cn("w-5 h-5 animate-spin", isDanger && "text-red-600")} />
            ) : (
              <Icon className={cn("w-5 h-5", isDanger && "text-red-600")} />
            )}
          </div>
          
          <div className="text-left">
            <p className={cn(
              "text-sm font-medium",
              isDanger ? "text-red-600" : "text-gray-900"
            )}>
              {option.label}
            </p>
          </div>
        </div>

        {!isDanger && (
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 shadow-sm flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">Configuración</h1>
      </header>

      <div className="px-4 pt-6 max-w-lg mx-auto space-y-6">

        {/* --- PERFIL HEADER --- */}
        {user && (
          <div 
            onClick={() => navigate('/settings/profile')}
            className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Editar perfil</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        )}

        {/* --- GRUPO 1: GESTIÓN --- */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">
            Administración
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {managementOptions.map((opt, i) => renderOptionRow(opt, i === managementOptions.length - 1))}
          </div>
        </div>

        {/* --- GRUPO 2: APP & CUENTA --- */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">
            General
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {appOptions.map((opt, i) => renderOptionRow(opt, i === appOptions.length - 1))}
          </div>
        </div>

        {/* --- LOGOUT BUTTON --- */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-white border border-red-100 rounded-2xl p-4 flex items-center justify-center gap-2 text-red-600 font-semibold shadow-sm active:bg-red-50 transition-colors"
        >
          {loggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5" />
          )}
          <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </button>

        {/* --- FOOTER APP INFO --- */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center p-2 bg-gray-100 rounded-xl mb-2">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              FB
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-900">FamiliaBuilder</p>
          <p className="text-xs text-gray-400 mt-0.5">Versión 1.0.0 (Beta)</p>
          <p className="text-[10px] text-gray-300 mt-4">Hecho con ❤️ para la familia</p>
        </div>

      </div>
    </div>
  );
}