import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  ArrowLeft,
  Shield,
  UserCheck,
  UserX,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserData {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
}

export default function UserApprovalManager() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Suscripción a usuarios en tiempo real
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData: UserData[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          approved: data.approved ?? true, // Si no tiene el campo, asumimos aprobado
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        };
      });

      // Ordenar: primero pendientes, luego aprobados
      usersData.sort((a, b) => {
        if (a.approved === b.approved) return 0;
        return a.approved ? 1 : -1;
      });

      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (userId: string) => {
    if (!currentUser) return;

    setProcessingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approved: true,
        approvedBy: currentUser.id,
        approvedAt: serverTimestamp(),
      });
      console.log('Usuario aprobado');
    } catch (error) {
      console.error('Error al aprobar usuario:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    try {
      // Eliminar el usuario de Firestore (no podrá acceder)
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      console.log('Usuario rechazado y eliminado');
    } catch (error) {
      console.error('Error al rechazar usuario:', error);
    } finally {
      setProcessingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  // Encontrar el nombre del usuario que aprobó
  const getApproverName = (approverId?: string) => {
    if (!approverId) return null;
    const approver = users.find(u => u.id === approverId);
    return approver?.name || 'Usuario';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Control de Acceso</h1>
          <p className="text-xs lg:text-sm text-gray-500">Gestiona quién puede usar la app</p>
        </div>
        <div className="p-2 bg-emerald-100 rounded-full">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-6 max-w-3xl mx-auto space-y-6">

        {/* --- LOADING --- */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        )}

        {/* --- USUARIOS PENDIENTES --- */}
        {!loading && pendingUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 ml-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Pendientes de Aprobación ({pendingUsers.length})
              </h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
              {pendingUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={cn(
                    "p-4",
                    index < pendingUsers.length - 1 && "border-b border-gray-100"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-lg flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      {user.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Solicitó acceso: {format(user.createdAt, "d MMM yyyy • HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processingId === user.id}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {processingId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      Aprobar
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(user.id)}
                      disabled={processingId === user.id}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>

                  {/* Confirmación de rechazo */}
                  {showDeleteConfirm === user.id && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          ¿Seguro que quieres rechazar a este usuario? No podrá acceder a la app.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="flex-1 bg-red-600 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Sí, rechazar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MENSAJE SIN PENDIENTES --- */}
        {!loading && pendingUsers.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-emerald-800 mb-1">Sin solicitudes pendientes</h3>
            <p className="text-sm text-emerald-600">
              No hay usuarios esperando aprobación en este momento.
            </p>
          </div>
        )}

        {/* --- USUARIOS APROBADOS --- */}
        {!loading && approvedUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 ml-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Miembros Activos ({approvedUsers.length})
              </h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {approvedUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "p-4 flex items-center gap-3",
                      isCurrentUser && "bg-blue-50/50"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                      isCurrentUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        isCurrentUser ? "text-blue-900" : "text-gray-900"
                      )}>
                        {user.name} {isCurrentUser && '(Tú)'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    {/* Badge de aprobado */}
                    <div className="text-right flex-shrink-0">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Activo
                      </div>
                      {user.approvedBy && user.approvedBy !== user.id && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          por {getApproverName(user.approvedBy)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- INFO --- */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">
                Sobre el control de acceso
              </p>
              <p className="text-xs text-blue-600">
                Cuando alguien nuevo intenta entrar a la app, su cuenta quedará pendiente
                hasta que un miembro activo la apruebe desde esta pantalla. Los usuarios
                rechazados no podrán acceder.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
