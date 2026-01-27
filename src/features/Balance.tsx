import { useMemo, useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import {
  Scale, TrendingUp, TrendingDown, User,
  DollarSign, AlertCircle, CheckCircle2,
  Wallet, History, Search, Filter
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';

export default function Balance() {
  const { userStats, transactions, totalExpenses, totalInBox, projects } = useDashboardData();
  const user = useAuthStore((state) => state.user);

  // Estado simple para simular la UI de búsqueda (listo para conectar tu lógica)
  const [searchTerm, setSearchTerm] = useState('');
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);

  const handleEditContribution = (contribution: typeof transactions[0]) => {
    setTransactionToEdit(contribution);
    setShowContributionForm(true);
  };

  const handleCloseForm = () => {
    setShowContributionForm(false);
    setTransactionToEdit(undefined);
  };

  // --- LÓGICA ORIGINAL (INTACTA) ---
  const currentUserStats = useMemo(() => {
    return userStats.find((stats) => stats.userId === user?.id);
  }, [userStats, user]);

  const userContributions = useMemo(() => {
    if (!user) return [];
    return transactions
      .filter((t) => t.type === 'contribution' && t.userId === user.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [transactions, user]);

  const amountToCatchUp = useMemo(() => {
    if (!currentUserStats) return 0;
    return currentUserStats.balance < 0 ? Math.abs(currentUserStats.balance) : 0;
  }, [currentUserStats]);

  // Calcular presupuesto efectivo total (considerando gastos si budget = 0)
  const effectiveBudgetTotal = useMemo(() => {
    return projects.reduce((sum, project) => {
      if (project.budget > 0) {
        return sum + project.budget;
      } else {
        // Si no tiene presupuesto, usar suma de gastos de ese proyecto
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

  // Cuánto falta por aportar para llegar a la meta
  const remainingToGoal = useMemo(() => {
    if (!currentUserStats) return 0;
    return Math.max(0, expectedContribution - currentUserStats.totalContributed);
  }, [expectedContribution, currentUserStats]);

  // Porcentaje de progreso hacia la meta
  const progressPercentage = useMemo(() => {
    if (!currentUserStats || expectedContribution === 0) return 0;
    return Math.min(100, (currentUserStats.totalContributed / expectedContribution) * 100);
  }, [currentUserStats, expectedContribution]);

  const recommendedContribution = useMemo(() => {
    if (amountToCatchUp === 0) return 0;
    return Math.max(amountToCatchUp, totalInBox * 0.25);
  }, [amountToCatchUp, totalInBox]);

  if (!currentUserStats || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <p className="text-gray-400 text-sm font-medium">Sincronizando finanzas...</p>
        </div>
      </div>
    );
  }

  const isInDebt = currentUserStats.balance < 0;
  const isCurrent = Math.abs(currentUserStats.balance) < 1;

  // Definir colores semánticos basados en el estado
  const statusColors = isInDebt 
    ? { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' }
    : isCurrent 
      ? { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' }
      : { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-8 font-sans">

      {/* --- HEADER STICKY TIPO APP --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-900 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Finanzas</h1>
          </div>
          <div className="flex gap-2">
             {/* Botones placeholder para filtros */}
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Barra de búsqueda integrada en header */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar transacción..." 
            className="w-full bg-gray-100 text-sm py-2 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-6 max-w-7xl mx-auto">

        {/* --- TARJETA PRINCIPAL (HERO) --- */}
        {/* Eliminamos bordes gruesos, usamos sombras suaves y gradientes sutiles */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all",
          isInDebt ? "bg-gradient-to-br from-red-500 to-rose-600" : 
          isCurrent ? "bg-gradient-to-br from-blue-600 to-indigo-700" : 
          "bg-gradient-to-br from-emerald-500 to-teal-700"
        )}>
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-90 mb-1">
              {isInDebt ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span className="text-sm font-medium tracking-wide">
                {isInDebt ? 'Saldo Pendiente' : 'Balance a favor'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-bold tracking-tight">
                {formatCurrency(Math.abs(currentUserStats.balance))}
              </span>
            </div>
            
            <p className="text-white/80 text-sm mt-1 mb-6">
              {isInDebt ? 'Debes ponerte al día' : isCurrent ? 'Estás totalmente al día' : 'Tienes saldo a favor'}
            </p>

            {/* Mini Grid dentro de la tarjeta */}
            <div className="grid grid-cols-2 gap-4 bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70">Tu Aporte Total</p>
                <p className="font-semibold text-lg">{formatCurrency(currentUserStats.totalContributed)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-70">Tu Cuota (25%)</p>
                <p className="font-semibold text-lg">{formatCurrency(currentUserStats.share)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- PROGRESO HACIA META DE PRESUPUESTOS --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Meta de Aportes</h3>
              <p className="text-xs text-gray-500">Basado en presupuestos totales</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tu meta esperada:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(expectedContribution)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Has aportado:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(currentUserStats?.totalContributed || 0)}</span>
            </div>

            {remainingToGoal > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">Te falta aportar:</span>
                <span className="text-lg font-bold text-amber-600">{formatCurrency(remainingToGoal)}</span>
              </div>
            )}

            {/* Barra de progreso */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Progreso</span>
                <span className={cn(
                  "text-sm font-bold",
                  progressPercentage >= 100 ? "text-emerald-600" :
                  progressPercentage >= 50 ? "text-blue-600" : "text-amber-600"
                )}>
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    progressPercentage >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                    progressPercentage >= 50 ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                    "bg-gradient-to-r from-amber-500 to-amber-600"
                  )}
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
            </div>

            {progressPercentage >= 100 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-700 font-medium">
                  ¡Excelente! Has cumplido tu meta de aportes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- ALERTAS DE ACCIÓN --- */}
        {isInDebt && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm">
            <div className="p-3 bg-amber-100 rounded-full flex-shrink-0">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm">Sugerencia de Pago</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-1">Cubre tu deuda + el 25% de caja</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(recommendedContribution)}</p>
            </div>
            <button className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-transform">
              Pagar
            </button>
          </div>
        )}

        {/* --- RESUMEN GENERAL (Estilo Widget) --- */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-md">
                <Wallet className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500">En Caja</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInBox)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 rounded-md">
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500">Gastos</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>

        {/* --- LISTA DE MIEMBROS (Diseño de Filas/Rows) --- */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-gray-800 text-lg">Estado del Grupo</h3>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {userStats.length} miembros
            </span>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {userStats.map((stats, index) => {
              const isCurrentUser = stats.userId === user.id;
              const userIsInDebt = stats.balance < 0;
              const isLast = index === userStats.length - 1;

              return (
                <div 
                  key={stats.userId}
                  className={cn(
                    "flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
                    !isLast && "border-b border-gray-50",
                    isCurrentUser && "bg-blue-50/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Simulado */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      isCurrentUser ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {stats.userName.charAt(0)}
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", isCurrentUser ? "text-blue-900" : "text-gray-900")}>
                        {stats.userName} {isCurrentUser && '(Tú)'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Aportado: {formatCurrency(stats.totalContributed)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={cn(
                      "text-sm font-bold block",
                      userIsInDebt ? "text-red-500" : "text-emerald-600"
                    )}>
                      {userIsInDebt ? '-' : '+'}{formatCurrency(Math.abs(stats.balance))}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-1 font-medium",
                      userIsInDebt ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {userIsInDebt ? 'Debe' : 'A favor'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- HISTORIAL (Compacto) --- */}
        <div>
          <h3 className="font-bold text-gray-800 text-lg mb-3 px-1 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Tus Movimientos
          </h3>

          <div className="space-y-3 lg:space-y-0">
            {userContributions.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Sin movimientos recientes</p>
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