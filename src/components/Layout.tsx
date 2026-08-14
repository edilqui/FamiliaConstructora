import { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* El padding inferior reserva el alto del BottomNav (h-16 / sm:h-[4.5rem])
          más el área segura del sistema (barra de gestos en móviles), para que
          ninguna página quede tapada por el nav */}
      <main
        className={
          user
            ? 'pb-[calc(4rem_+_env(safe-area-inset-bottom))] sm:pb-[calc(4.5rem_+_env(safe-area-inset-bottom))]'
            : undefined
        }
      >
        {children}
      </main>
      {user && <BottomNav />}
    </div>
  );
}
