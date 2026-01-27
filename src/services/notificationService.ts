import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Notification, NotificationType } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

interface CreateNotificationParams {
  type: NotificationType;
  message: string;
  createdBy: string;
  createdByName: string;
  transactionId?: string;
  transactionDescription?: string;
  amount?: number;
  projectName?: string;
  excludeUserId?: string; // Para excluir al usuario que creó la acción de recibir su propia notificación
}

/**
 * Crea una nueva notificación
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const {
      type,
      message,
      createdBy,
      createdByName,
      transactionId,
      transactionDescription,
      amount,
      projectName,
      excludeUserId
    } = params;

    // Inicializar readBy con el usuario que creó la acción si se debe excluir
    const initialReadBy = excludeUserId ? [excludeUserId] : [];

    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      type,
      message,
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
      transactionId: transactionId || null,
      transactionDescription: transactionDescription || null,
      amount: amount || null,
      projectName: projectName || null,
      readBy: initialReadBy
    });

    console.log('✅ Notificación creada');
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw error;
  }
};

/**
 * Marca una notificación como leída/eliminada para un usuario específico
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      readBy: arrayUnion(userId)
    });
    console.log('✅ Notificación marcada como leída');
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

/**
 * Marca todas las notificaciones como leídas para un usuario específico
 */
export const markAllNotificationsAsRead = async (notificationIds: string[], userId: string) => {
  try {
    const promises = notificationIds.map(id => markNotificationAsRead(id, userId));
    await Promise.all(promises);
    console.log('✅ Todas las notificaciones marcadas como leídas');
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
};

/**
 * Elimina notificaciones que todos los usuarios han leído
 * (Se debe ejecutar periódicamente o después de que un usuario marque como leído)
 */
export const cleanupReadNotifications = async (totalUsers: number) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(notificationsRef);
    const snapshot = await getDocs(q);

    const deletePromises: Promise<void>[] = [];

    snapshot.forEach((docSnapshot) => {
      const notification = docSnapshot.data();
      // Si todos los usuarios han leído la notificación, eliminarla
      if (notification.readBy && notification.readBy.length >= totalUsers) {
        deletePromises.push(deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, docSnapshot.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`✅ ${deletePromises.length} notificaciones limpiadas`);
    }
  } catch (error) {
    console.error('Error al limpiar notificaciones:', error);
  }
};

/**
 * Suscribirse a notificaciones en tiempo real
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(notificationsRef);

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Solo incluir notificaciones que este usuario NO ha leído
      if (!data.readBy || !data.readBy.includes(userId)) {
        notifications.push({
          id: doc.id,
          type: data.type,
          message: data.message,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt?.toDate() || new Date(),
          transactionId: data.transactionId,
          transactionDescription: data.transactionDescription,
          amount: data.amount,
          projectName: data.projectName,
          readBy: data.readBy || []
        });
      }
    });

    // Ordenar en el cliente por fecha de creación (más reciente primero)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    callback(notifications);
  });
};

/**
 * Obtener el conteo de notificaciones no leídas para un usuario
 */
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const snapshot = await getDocs(notificationsRef);

    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.readBy || !data.readBy.includes(userId)) {
        count++;
      }
    });

    return count;
  } catch (error) {
    console.error('Error al obtener conteo de notificaciones:', error);
    return 0;
  }
};
