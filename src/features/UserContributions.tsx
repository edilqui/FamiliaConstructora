import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  History,
  User
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';

export default function UserContributions() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, userStats, transactions, projects } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);

  // Encontrar el usuario
  const targetUser = useMemo(() => {
    return users.find(u => u.id === userId);
  }, [users, userId]);

  // Estadísticas del usuario
  const targetUserStats = useMemo(() => {
    return userStats.find(s => s.userId === userId);
  }, [userStats, userId]);

  // Obtener todas las contribuciones del usuario
  const userContributions = useMemo(() => {
    if (!userId) return [];
    return transactions
      .filter((t) => t.type === 'contribution' && t.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, userId]);

  // Calcular presupuesto efectivo total
  const effectiveBudgetTotal = useMemo(() => {
    return projects.reduce((sum, project) => {
      if (project.budget > 0) {
        return sum + project.budget;
      } else {
        const projectExpenses = transactions
          .filter(t => t.type === 'expense' && t.projectId === project.id)
          .reduce((expSum, t) => expSum + t.amount, 0);
        return sum + projectExpenses;
      }
    }, 0);
  }, [projects, transactions]);

  // Calcular cuánto le corresponde a cada usuario
  const expectedContribution = useMemo(() => {
    const numberOfUsers = userStats.length || 4;
    return effectiveBudgetTotal / numberOfUsers;
  }, [effectiveBudgetTotal, userStats.length]);

  // Porcentaje de progreso
  const progressPercentage = useMemo(() => {
    if (!targetUserStats || expectedContribution === 0) return 0;
    return Math.min(100, (targetUserStats.totalContributed / expectedContribution) * 100);
  }, [targetUserStats, expectedContribution]);

  const handleEditContribution = (contribution: typeof transactions[0]) => {
    setTransactionToEdit(contribution);
    setShowContributionForm(true);
  };

  const handleCloseForm = () => {
    setShowContributionForm(false);
    setTransactionToEdit(undefined);
  };

  const isCurrentUser = userId === currentUser?.id;

  if (!targetUser || !targetUserStats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Usuario no encontrado</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 font-medium hover:underline"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
              isCurrentUser ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
            )}>
              {targetUser.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">
                {targetUser.name} {isCurrentUser && '(Tú)'}
              </h1>
              <p className="text-xs text-gray-500">Historial de aportes</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-6 max-w-4xl mx-auto">

        {/* --- TARJETA DE RESUMEN --- */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg",
          progressPercentage >= 100 ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
          progressPercentage >= 50 ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
          "bg-gradient-to-br from-amber-500 to-orange-600"
        )}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-90 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Total Aportado</span>
            </div>

            <p className="text-3xl font-bold tracking-tight mb-3">
              {formatCurrency(targetUserStats.totalContributed)}
            </p>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70">Meta esperada</p>
                <p className="font-semibold">{formatCurrency(expectedContribution)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70">Progreso</p>
                <p className="font-semibold">{progressPercentage.toFixed(0)}%</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mt-3">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/90 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- HISTORIAL DE APORTES --- */}
        <div>
          <h3 className="font-bold text-gray-800 text-lg mb-3 px-1 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Movimientos
            <span className="text-sm font-normal text-gray-400">
              ({userContributions.length} aportes)
            </span>
          </h3>

          <div className="space-y-3 lg:space-y-0">
            {userContributions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm font-medium">Sin aportes registrados</p>
                <p className="text-gray-400 text-xs mt-1">
                  Los aportes de {targetUser.name} aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header de tabla (solo desktop) */}
                <div className="hidden lg:grid lg:grid-cols-[auto_1fr_200px_140px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="w-10"></div>
                  <div>Descripción</div>
                  <div className="text-center">Fecha y Hora</div>
                  <div className="text-right">Monto</div>
                </div>

                {/* Filas */}
                <div className="divide-y divide-gray-50 lg:divide-gray-100">
                  {userContributions.map((contribution) => (
                    <button
                      key={contribution.id}
                      onClick={() => handleEditContribution(contribution)}
                      className="w-full p-3 lg:px-4 lg:py-3 flex lg:grid lg:grid-cols-[auto_1fr_200px_140px] items-center gap-3 lg:gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Icono */}
                      <div className="p-2 bg-green-50 rounded-lg text-green-600 flex-shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>

                      {/* Descripción - Layout móvil y desktop */}
                      <div className="flex-1 min-w-0 lg:flex-none">
                        <p className="text-sm font-medium text-gray-800 truncate">{contribution.description}</p>
                        {/* Fecha solo en móvil */}
                        <p className="text-xs text-gray-400 lg:hidden">
                          {format(contribution.date, "d MMM • HH:mm", { locale: es })}
                        </p>
                      </div>

                      {/* Fecha (solo desktop) */}
                      <div className="hidden lg:block text-center text-sm text-gray-600">
                        {format(contribution.date, "d MMM yyyy • HH:mm", { locale: es })}
                      </div>

                      {/* Monto */}
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-emerald-600 text-sm lg:text-base">
                          +{formatCurrency(contribution.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de edición de contribución */}
      {showContributionForm && (
        <ContributionForm
          onClose={handleCloseForm}
          transactionToEdit={transactionToEdit}
        />
      )}
    </div>
  );
}
