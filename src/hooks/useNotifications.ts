import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  cleanupReadNotifications
} from '../services/notificationService';
import type { Notification } from '../types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Suscribirse a notificaciones en tiempo real
    const unsubscribe = subscribeToNotifications(user.id, (newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await markNotificationAsRead(notificationId, user.id);

      // Limpiar notificaciones que todos han leído (asumo 4 usuarios)
      // Puedes ajustar esto para obtener el número real de usuarios
      await cleanupReadNotifications(4);
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const notificationIds = notifications.map(n => n.id);
      await markAllNotificationsAsRead(notificationIds, user.id);

      // Limpiar notificaciones que todos han leído
      await cleanupReadNotifications(4);
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  const unreadCount = notifications.length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
