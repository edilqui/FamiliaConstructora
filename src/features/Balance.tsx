import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import {
  Scale, TrendingUp, TrendingDown,
  DollarSign, AlertCircle, CheckCircle2,
  Wallet, History, ClipboardCheck, Loader2, X, ChevronRight
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useModalHistory } from '../hooks/useModalHistory';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';
import ContributionDetail from '../components/ContributionDetail';
import { getRunningTotals } from '../lib/contributions';
import NotificationButton from '../components/NotificationButton';
import AmountInput from '../components/AmountInput';
import { addCashCount, subscribeCashCounts } from '../services/cashCountService';
import { toast } from '../store/useToastStore';
import type { CashCount } from '../types';

export default function Balance() {
  const { users, userStats, memberStats, collaboratorStats, transactions, totalExpenses, totalInBox, projects, memberCount, loading } = useDashboardData();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Verificar si el usuario actual es colaborador
  const isCollaborator = user?.role === 'collaborator';

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  const handleEditContribution = (contribution: typeof transactions[0]) => {
    setTransactionToEdit(contribution);
    setShowContributionForm(true);
  };

  const handleCloseForm = () => {
    setShowContributionForm(false);
    setTransactionToEdit(undefined);
  };

  // --- ARQUEO DE CAJA (conteo físico vs saldo teórico) ---
  const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
  const [showCashCount, setShowCashCount] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');
  const [savingCount, setSavingCount] = useState(false);

  useEffect(() => subscribeCashCounts(setCashCounts), []);
  useModalHistory(showCashCount, () => setShowCashCount(false));

  const lastCashCount = cashCounts[0];
  const countedValue = countedAmount ? parseFloat(countedAmount) : NaN;
  const liveDifference = isNaN(countedValue) ? null : countedValue - totalInBox;

  const handleSaveCashCount = async () => {
    if (!user || isNaN(countedValue)) return;
    setSavingCount(true);
    try {
      await addCashCount({
        countedAmount: countedValue,
        expectedAmount: totalInBox,
        countedBy: user.id,
        countedByName: user.name,
      });
      toast(
        countedValue === totalInBox
          ? 'Arqueo registrado: la caja cuadró'
          : `Arqueo registrado con descuadre de ${formatCurrency(countedValue - totalInBox)}`
      );
      setShowCashCount(false);
      setCountedAmount('');
    } catch {
      toast('No se pudo guardar el arqueo. Intenta de nuevo.', { type: 'error' });
    } finally {
      setSavingCount(false);
    }
  };

  // --- LÓGICA ORIGINAL (INTACTA) ---
  const currentUserStats = useMemo(() => {
    return userStats.find((stats) => stats.userId === user?.id);
  }, [userStats, user]);

  const allUserContributions = useMemo(() => {
    if (!user) return [];
    return transactions
      .filter((t) => t.type === 'contribution' && t.userId === user.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, user]);

  const userContributions = allUserContributions.slice(0, 10);
  const runningTotals = useMemo(() => getRunningTotals(allUserContributions), [allUserContributions]);
  // Se busca por id para que el detalle refleje ediciones y se cierre si el aporte se elimina
  const detailContribution = allUserContributions.find((c) => c.id === detailId);

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

  // Calcular cuánto le corresponde a cada MIEMBRO (no colaboradores)
  const expectedContribution = useMemo(() => {
    // Si el usuario es colaborador, no tiene meta de aportes
    if (isCollaborator) return 0;
    const numberOfMembers = memberCount || 4;
    return effectiveBudgetTotal / numberOfMembers;
  }, [effectiveBudgetTotal, memberCount, isCollaborator]);

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

  // Sugerencia = lo que debe para quedar al día (antes sumaba un 25% de caja
  // hardcodeado que no correspondía al número real de miembros)
  const recommendedContribution = amountToCatchUp;

  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  // Mientras cargan los datos: spinner. Si ya cargaron y aun así no hay stats
  // del usuario, mostramos un estado claro en vez de una espera infinita.
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Sincronizando finanzas...</p>
        </div>
      </div>
    );
  }

  if (!currentUserStats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 px-8 text-center">
        <div>
          <Scale className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-medium">Aún no hay datos de tu cuenta.</p>
          <p className="text-gray-500 text-xs mt-1">Registra tu primer aporte o gasto para ver tu balance.</p>
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
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">

      {/* --- HEADER STICKY TIPO APP --- */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-900 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Finanzas</h1>
          </div>
          <NotificationButton />
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

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
                <p className="text-[10px] uppercase tracking-wider opacity-70">
                  Tu Cuota (1/{memberCount || 4})
                </p>
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
              <h3 className="font-bold text-gray-800 text-sm">Sugerencia de Aporte</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-1">Para ponerte al día con el grupo</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(recommendedContribution)}</p>
            </div>
            <button
              onClick={() => { setTransactionToEdit(undefined); setShowContributionForm(true); }}
              className="bg-amber-500 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-transform"
            >
              Aportar
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

        {/* --- ARQUEO DE CAJA --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Arqueo de Caja</h3>
                <p className="text-xs text-gray-500">¿El efectivo físico coincide con la app?</p>
              </div>
            </div>
            <button
              onClick={() => { setCountedAmount(''); setShowCashCount(true); }}
              className="bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-transform flex-shrink-0"
            >
              Contar caja
            </button>
          </div>

          {lastCashCount ? (
            <div className={cn(
              'rounded-xl p-3 border flex items-center justify-between gap-3',
              lastCashCount.difference === 0
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-amber-50 border-amber-100'
            )}>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">
                  {lastCashCount.difference === 0 ? 'La caja cuadró' : `Descuadre: ${formatCurrency(lastCashCount.difference)}`}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {lastCashCount.countedByName} contó {formatCurrency(lastCashCount.countedAmount)} · {format(lastCashCount.createdAt, "d MMM, HH:mm", { locale: es })}
                </p>
              </div>
              {lastCashCount.difference === 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
            </div>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
              Aún no se ha hecho ningún arqueo. Cuenten el efectivo y regístrenlo para verificar que la caja cuadre.
            </p>
          )}
        </div>

        {/* --- LISTA DE MIEMBROS (Solo los que dividen gastos) --- */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-gray-800 text-lg">Estado del Grupo</h3>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {memberStats.length} miembros
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {memberStats.map((stats, index) => {
              const isCurrentUser = stats.userId === user.id;
              const userIsInDebt = stats.balance < 0;
              const isLast = index === memberStats.length - 1;

              return (
                <button
                  key={stats.userId}
                  onClick={() => navigate(`/user/${stats.userId}/contributions`)}
                  aria-label={`Ver aportes de ${stats.userName}`}
                  className={cn(
                    "w-full text-left flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
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
                      <p className="text-xs text-gray-500">
                        Aportado: {formatCurrency(stats.totalContributed)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className={cn(
                        "text-sm font-bold block",
                        userIsInDebt ? "text-red-500" : "text-emerald-600"
                      )}>
                        {userIsInDebt ? '-' : '+'}{formatCurrency(Math.abs(stats.balance))}
                      </span>
                      <span className={cn(
                        "text-[11px] px-1.5 py-0.5 rounded-full inline-block mt-1 font-medium",
                        userIsInDebt ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {userIsInDebt ? 'Debe' : 'A favor'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- COLABORADORES (Si hay alguno) --- */}
        {collaboratorStats.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-gray-800 text-lg">Colaboradores</h3>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {collaboratorStats.length} {collaboratorStats.length === 1 ? 'persona' : 'personas'}
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {collaboratorStats.map((stats, index) => {
                const isCurrentUser = stats.userId === user.id;
                const isLast = index === collaboratorStats.length - 1;

                return (
                  <button
                    key={stats.userId}
                    onClick={() => navigate(`/user/${stats.userId}/contributions`)}
                    aria-label={`Ver aportes de ${stats.userName}`}
                    className={cn(
                      "w-full text-left flex items-center justify-between p-4 hover:bg-gray-50 transition-colors",
                      !isLast && "border-b border-gray-50",
                      isCurrentUser && "bg-purple-50/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar con icono de colaborador */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                        isCurrentUser ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {stats.userName.charAt(0)}
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", isCurrentUser ? "text-purple-900" : "text-gray-900")}>
                          {stats.userName} {isCurrentUser && '(Tú)'}
                        </p>
                        <p className="text-xs text-purple-500">
                          Colaborador • No divide gastos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold block text-emerald-600">
                          +{formatCurrency(stats.totalContributed)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-1 font-medium bg-emerald-50 text-emerald-600">
                          Aportado
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- HISTORIAL (Compacto) --- */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Tus Aportes
            </h3>
            {allUserContributions.length > 0 && (
              <button
                onClick={() => navigate(`/user/${user.id}/contributions`)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 py-1.5"
              >
                Ver todos ({allUserContributions.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3 lg:space-y-0">
            {userContributions.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Aún no tienes aportes registrados</p>
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
                      onClick={() => setDetailId(contribution.id)}
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
                          {format(contribution.date, "d MMM yyyy • HH:mm", { locale: es })}
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

      {/* Detalle de solo lectura; queda debajo del formulario al editar */}
      {detailContribution && (
        <ContributionDetail
          contribution={detailContribution}
          runningTotal={runningTotals.get(detailContribution.id)}
          registeredByName={users.find((u) => u.id === detailContribution.registeredBy)?.name}
          onClose={() => setDetailId(null)}
          onEdit={() => handleEditContribution(detailContribution)}
        />
      )}

      {/* Modal de edición de contribución */}
      {showContributionForm && (
        <ContributionForm
          onClose={handleCloseForm}
          transactionToEdit={transactionToEdit}
        />
      )}

      {/* --- BOTTOM SHEET: REGISTRAR ARQUEO --- */}
      {showCashCount && (
        <div role="dialog" aria-modal="true" aria-label="Registrar arqueo de caja" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCashCount(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-600 rounded-full">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Arqueo de Caja</h2>
              </div>
              <button onClick={() => setShowCashCount(false)} aria-label="Cerrar arqueo" className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-blue-800 font-medium">Saldo según la app</span>
                <span className="text-lg font-bold text-blue-900 tabular-nums">{formatCurrency(totalInBox)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                  ¿Cuánto efectivo contaron?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-light text-gray-400">$</span>
                  <AmountInput
                    value={countedAmount}
                    onChange={setCountedAmount}
                    placeholder="0"
                    aria-label="Efectivo contado"
                    autoFocus
                    className="w-full pl-10 pr-4 py-4 text-4xl font-bold text-gray-900 bg-teal-50/50 border-2 border-transparent focus:border-teal-500 rounded-2xl focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              {liveDifference !== null && (
                <div className={cn(
                  'rounded-xl p-3 flex items-center gap-3 border',
                  liveDifference === 0
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-amber-50 border-amber-100'
                )}>
                  {liveDifference === 0
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                  <p className="text-sm font-medium text-gray-700">
                    {liveDifference === 0
                      ? '¡La caja cuadra exacto!'
                      : liveDifference > 0
                        ? <>Sobran <b>{formatCurrency(liveDifference)}</b> respecto a la app</>
                        : <>Faltan <b>{formatCurrency(Math.abs(liveDifference))}</b> respecto a la app</>}
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveCashCount}
                disabled={savingCount || isNaN(countedValue)}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingCount ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                Registrar arqueo
              </button>

              {cashCounts.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Arqueos anteriores</p>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {cashCounts.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{c.countedByName}</p>
                          <p className="text-[11px] text-gray-500">{format(c.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-800 tabular-nums">{formatCurrency(c.countedAmount)}</p>
                          <p className={cn('text-[11px] font-semibold', c.difference === 0 ? 'text-emerald-600' : 'text-amber-600')}>
                            {c.difference === 0 ? 'Cuadró' : `${c.difference > 0 ? '+' : ''}${formatCurrency(c.difference)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}