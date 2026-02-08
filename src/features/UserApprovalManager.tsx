import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardData } from '../hooks/useDashboardData';
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
  Trash2,
  AlertCircle,
  XCircle,
  UserCog,
  Heart,
  Crown
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { UserRole } from '../types';

interface UserData {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  role: UserRole;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
}

export default function UserApprovalManager() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { transactions } = useDashboardData();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRemoveUserConfirm, setShowRemoveUserConfirm] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const [pendingApprovalRole, setPendingApprovalRole] = useState<UserRole>('member');

  // Calcular transacciones por usuario
  const transactionsByUser = useMemo(() => {
    const map = new Map<string, { contributions: number; expenses: number; total: number }>();

    transactions.forEach(t => {
      const userId = t.userId;
      const current = map.get(userId) || { contributions: 0, expenses: 0, total: 0 };

      if (t.type === 'contribution') {
        current.contributions += t.amount;
      } else {
        current.expenses += t.amount;
      }
      current.total++;

      map.set(userId, current);
    });

    return map;
  }, [transactions]);

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
          approved: data.approved ?? true,
          role: data.role || 'member',
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        };
      });

      // Ordenar: primero pendientes, luego miembros, luego colaboradores
      usersData.sort((a, b) => {
        if (a.approved !== b.approved) return a.approved ? 1 : -1;
        if (a.role !== b.role) return a.role === 'member' ? -1 : 1;
        return 0;
      });

      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (userId: string, role: UserRole) => {
    if (!currentUser) return;

    setProcessingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approved: true,
        role: role,
        approvedBy: currentUser.id,
        approvedAt: serverTimestamp(),
      });
      console.log('Usuario aprobado como', role);
    } catch (error) {
      console.error('Error al aprobar usuario:', error);
    } finally {
      setProcessingId(null);
      setShowRoleSelector(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setProcessingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      console.log('Rol cambiado a', newRole);
    } catch (error) {
      console.error('Error al cambiar rol:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    try {
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

  const handleRemoveUser = async (userId: string) => {
    const userTx = transactionsByUser.get(userId);
    if (userTx && userTx.total > 0) return;

    setProcessingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      console.log('Usuario eliminado');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    } finally {
      setProcessingId(null);
      setShowRemoveUserConfirm(null);
    }
  };

  const pendingUsers = users.filter(u => !u.approved);
  const memberUsers = users.filter(u => u.approved && u.role === 'member');
  const collaboratorUsers = users.filter(u => u.approved && u.role === 'collaborator');

  const canDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) return false;
    const userTx = transactionsByUser.get(userId);
    return !userTx || userTx.total === 0;
  };

  const getUserTransactionInfo = (userId: string) => {
    return transactionsByUser.get(userId) || { contributions: 0, expenses: 0, total: 0 };
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'member') {
      return (
        <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-1 rounded-full">
          <Crown className="w-3 h-3" />
          Miembro
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-medium px-2 py-1 rounded-full">
        <Heart className="w-3 h-3" />
        Colaborador
      </div>
    );
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
          <p className="text-xs lg:text-sm text-gray-500">Gestiona usuarios y roles</p>
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
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-lg flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>

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

                  {/* Selector de rol para aprobar */}
                  {showRoleSelector === user.id ? (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-blue-800 mb-3">¿Cómo quieres aprobar a {user.name}?</p>

                      <div className="space-y-2 mb-4">
                        <button
                          onClick={() => setPendingApprovalRole('member')}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 text-left transition-all",
                            pendingApprovalRole === 'member'
                              ? "border-blue-500 bg-blue-100"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Crown className={cn("w-4 h-4", pendingApprovalRole === 'member' ? "text-blue-600" : "text-gray-400")} />
                            <span className="font-medium text-gray-900">Miembro</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            Participa en la división de gastos (como los 4 hermanos)
                          </p>
                        </button>

                        <button
                          onClick={() => setPendingApprovalRole('collaborator')}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 text-left transition-all",
                            pendingApprovalRole === 'collaborator'
                              ? "border-purple-500 bg-purple-100"
                              : "border-gray-200 bg-white hover:border-purple-300"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Heart className={cn("w-4 h-4", pendingApprovalRole === 'collaborator' ? "text-purple-600" : "text-gray-400")} />
                            <span className="font-medium text-gray-900">Colaborador</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            Solo puede aportar, no tiene cuota de gastos (ej: padres)
                          </p>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRoleSelector(null)}
                          className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleApprove(user.id, pendingApprovalRole)}
                          disabled={processingId === user.id}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                        >
                          {processingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          Aprobar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setShowRoleSelector(user.id);
                          setPendingApprovalRole('member');
                        }}
                        disabled={processingId === user.id}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
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
                  )}

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

        {/* --- MIEMBROS (dividen gastos) --- */}
        {!loading && memberUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 ml-2">
              <Crown className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Miembros ({memberUsers.length})
              </h2>
              <span className="text-[10px] text-gray-400 ml-1">• Dividen gastos equitativamente</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {memberUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const canDelete = canDeleteUser(user.id);
                const txInfo = getUserTransactionInfo(user.id);

                return (
                  <div
                    key={user.id}
                    className={cn(
                      "p-4",
                      isCurrentUser && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                        isCurrentUser ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
                      )}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm truncate",
                          isCurrentUser ? "text-blue-900" : "text-gray-900"
                        )}>
                          {user.name} {isCurrentUser && '(Tú)'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {txInfo.total > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {txInfo.total} transacciones • Aportes: {formatCurrency(txInfo.contributions)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getRoleBadge(user.role)}

                        {!isCurrentUser && (
                          <>
                            <button
                              onClick={() => handleChangeRole(user.id, 'collaborator')}
                              disabled={processingId === user.id}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Cambiar a Colaborador"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => canDelete ? setShowRemoveUserConfirm(user.id) : null}
                              disabled={!canDelete}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                canDelete
                                  ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  : "text-gray-300 cursor-not-allowed"
                              )}
                              title={canDelete ? "Eliminar usuario" : "No se puede eliminar: tiene transacciones"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {showRemoveUserConfirm === user.id && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-red-700 font-medium">¿Eliminar a {user.name}?</p>
                            <p className="text-[10px] text-red-600 mt-1">
                              Este usuario no tiene transacciones registradas.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRemoveUserConfirm(null)}
                            className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            disabled={processingId === user.id}
                            className="flex-1 bg-red-600 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1"
                          >
                            {processingId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCurrentUser && !canDelete && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-2 ml-13">
                        <XCircle className="w-3 h-3" />
                        No eliminable: tiene {txInfo.total} transacciones
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- COLABORADORES (solo aportan) --- */}
        {!loading && collaboratorUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 ml-2">
              <Heart className="w-4 h-4 text-purple-500" />
              <h2 className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                Colaboradores ({collaboratorUsers.length})
              </h2>
              <span className="text-[10px] text-gray-400 ml-1">• Solo aportan, sin cuota</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {collaboratorUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const canDelete = canDeleteUser(user.id);
                const txInfo = getUserTransactionInfo(user.id);

                return (
                  <div
                    key={user.id}
                    className={cn(
                      "p-4",
                      isCurrentUser && "bg-purple-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 bg-purple-100 text-purple-700">
                        {user.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-gray-900">
                          {user.name} {isCurrentUser && '(Tú)'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {txInfo.contributions > 0 && (
                          <p className="text-[10px] text-purple-500 mt-1">
                            Ha aportado: {formatCurrency(txInfo.contributions)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getRoleBadge(user.role)}

                        {!isCurrentUser && (
                          <>
                            <button
                              onClick={() => handleChangeRole(user.id, 'member')}
                              disabled={processingId === user.id}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Cambiar a Miembro"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => canDelete ? setShowRemoveUserConfirm(user.id) : null}
                              disabled={!canDelete}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                canDelete
                                  ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  : "text-gray-300 cursor-not-allowed"
                              )}
                              title={canDelete ? "Eliminar usuario" : "No se puede eliminar: tiene transacciones"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {showRemoveUserConfirm === user.id && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-red-700 font-medium">¿Eliminar a {user.name}?</p>
                            <p className="text-[10px] text-red-600 mt-1">
                              Este usuario no tiene transacciones registradas.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRemoveUserConfirm(null)}
                            className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            disabled={processingId === user.id}
                            className="flex-1 bg-red-600 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1"
                          >
                            {processingId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCurrentUser && !canDelete && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-2 ml-13">
                        <XCircle className="w-3 h-3" />
                        No eliminable: tiene {txInfo.total} transacciones
                      </p>
                    )}
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
              <p className="text-sm font-medium text-blue-800 mb-2">
                Tipos de usuarios
              </p>
              <div className="space-y-2 text-xs text-blue-600">
                <div className="flex items-start gap-2">
                  <Crown className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p><strong>Miembros:</strong> Dividen los gastos equitativamente. Su cuota = Total gastos ÷ N° de miembros</p>
                </div>
                <div className="flex items-start gap-2">
                  <Heart className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p><strong>Colaboradores:</strong> Pueden aportar dinero pero no tienen cuota de gastos. Ideal para padres u otros familiares que ayudan ocasionalmente.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
