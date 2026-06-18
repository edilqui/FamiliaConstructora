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
      <main>{children}</main>
      {user && <BottomNav />}
    </div>
  );
}
