import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  History,
  Loader2,
  User,
  Download,
  ChevronDown
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useSmartBack } from '../hooks/useSmartBack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ContributionForm from './ContributionForm';
import ContributionDetail from '../components/ContributionDetail';
import { getRunningTotals, sortOldestFirst } from '../lib/contributions';
import { buildContributionStatementCsv, downloadCsv } from '../lib/exportCsv';
import { toast } from '../store/useToastStore';

export default function UserContributions() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack('/');
  const { users, userStats, transactions, projects, memberCount, loading } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);
  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<typeof transactions[0] | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');

  // Encontrar el usuario
  const targetUser = useMemo(() => {
    return users.find(u => u.id === userId);
  }, [users, userId]);

  // Verificar si es colaborador
  const isCollaborator = targetUser?.role === 'collaborator';

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

  const runningTotals = useMemo(() => getRunningTotals(userContributions), [userContributions]);

  const availableYears = useMemo(() => {
    const years = new Set(userContributions.map((c) => c.date.getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [userContributions]);

  const availableMonths = useMemo(() => {
    if (filterYear === 'all') return [];
    const months = new Set(
      userContributions
        .filter((c) => c.date.getFullYear() === filterYear)
        .map((c) => c.date.getMonth())
    );
    return Array.from(months).sort((a, b) => a - b);
  }, [userContributions, filterYear]);

  const filteredContributions = useMemo(() => {
    return userContributions.filter((c) =>
      (filterYear === 'all' || c.date.getFullYear() === filterYear) &&
      (filterMonth === 'all' || c.date.getMonth() === filterMonth)
    );
  }, [userContributions, filterYear, filterMonth]);

  const filteredTotal = filteredContributions.reduce((sum, c) => sum + c.amount, 0);
  const hasActiveFilter = filterYear !== 'all';

  // Se busca por id para que el detalle refleje ediciones y se cierre si el aporte se elimina
  const detailContribution = userContributions.find((c) => c.id === detailId);

  const getRegisteredByName = (contribution: typeof transactions[0]) =>
    users.find((u) => u.id === contribution.registeredBy)?.name ?? '';

  const handleExport = () => {
    const rows = sortOldestFirst(filteredContributions).map((contribution) => ({
      contribution,
      runningTotal: runningTotals.get(contribution.id) ?? 0,
      registeredByName: getRegisteredByName(contribution),
    }));
    const period = filterYear === 'all'
      ? 'completo'
      : filterMonth === 'all'
        ? String(filterYear)
        : `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;
    const name = (targetUser?.name ?? 'usuario').replace(/[^\p{L}\p{N}]+/gu, '-');
    downloadCsv(buildContributionStatementCsv(rows), `estado-de-cuenta-${name}-${period}.csv`);
    toast(`${rows.length} ${rows.length === 1 ? 'aporte exportado' : 'aportes exportados'} a CSV`);
  };

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

  // Calcular cuánto le corresponde a cada MIEMBRO (no colaboradores)
  const expectedContribution = useMemo(() => {
    // Los colaboradores no tienen meta de aportes
    if (isCollaborator) return 0;
    const numberOfMembers = memberCount || 4;
    return effectiveBudgetTotal / numberOfMembers;
  }, [effectiveBudgetTotal, memberCount, isCollaborator]);

  // Porcentaje de progreso (100% para colaboradores ya que no tienen meta)
  const progressPercentage = useMemo(() => {
    if (isCollaborator) return 100; // Colaboradores siempre al 100%
    if (!targetUserStats || expectedContribution === 0) return 0;
    return Math.min(100, (targetUserStats.totalContributed / expectedContribution) * 100);
  }, [targetUserStats, expectedContribution, isCollaborator]);

  const handleEditContribution = (contribution: typeof transactions[0]) => {
    setTransactionToEdit(contribution);
    setShowContributionForm(true);
  };

  const handleCloseForm = () => {
    setShowContributionForm(false);
    setTransactionToEdit(undefined);
  };

  const isCurrentUser = userId === currentUser?.id;

  if (loading || users.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">

      {/* --- HEADER STICKY --- */}
      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          headerHidden ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="Volver"
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors -ml-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
              isCollaborator ? "bg-purple-100 text-purple-700" :
              isCurrentUser ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
            )}>
              {targetUser.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">
                {targetUser.name} {isCurrentUser && '(Tú)'}
              </h1>
              <p className={cn(
                "text-xs",
                isCollaborator ? "text-purple-500" : "text-gray-500"
              )}>
                {isCollaborator ? 'Colaborador • Historial de aportes' : 'Historial de aportes'}
              </p>
            </div>
          </div>
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-4 lg:pt-6 space-y-6 max-w-4xl mx-auto">

        {/* --- TARJETA DE RESUMEN --- */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg",
          isCollaborator ? "bg-gradient-to-br from-purple-500 to-purple-700" :
          progressPercentage >= 100 ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
          progressPercentage >= 50 ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
          "bg-gradient-to-br from-amber-500 to-orange-600"
        )}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-90 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Total Aportado</span>
              {isCollaborator && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Colaborador</span>
              )}
            </div>

            <p className="text-3xl font-bold tracking-tight mb-3">
              {formatCurrency(targetUserStats.totalContributed)}
            </p>

            {/* Mini stats - diferentes para colaboradores */}
            {isCollaborator ? (
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider opacity-70">Estado</p>
                <p className="font-semibold">No participa en división de gastos</p>
                <p className="text-xs opacity-70 mt-1">
                  Los aportes de colaboradores van directamente a la caja común
                </p>
              </div>
            ) : (
              <>
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

                {/* Barra de progreso - solo para miembros */}
                <div className="mt-3">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/90 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, progressPercentage)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- HISTORIAL DE APORTES --- */}
        <div>
          <h3 className="font-bold text-gray-800 text-lg mb-3 px-1 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            Estado de cuenta
          </h3>

          {userContributions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value));
                      setFilterMonth('all');
                    }}
                    aria-label="Filtrar por año"
                    className="w-full appearance-none bg-gray-50 text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">Todos los años</option>
                    {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    disabled={filterYear === 'all'}
                    aria-label="Filtrar por mes"
                    className="w-full appearance-none bg-gray-50 text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  >
                    <option value="all">Todos los meses</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {format(new Date(2000, month, 1), 'MMMM', { locale: es })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    {hasActiveFilter ? 'Total del período' : 'Total'} · {filteredContributions.length} {filteredContributions.length === 1 ? 'aporte' : 'aportes'}
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(filteredTotal)}</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={filteredContributions.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              </div>
            </div>
          )}

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
                  {filteredContributions.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">Sin aportes en este período</p>
                  )}
                  {filteredContributions.map((contribution) => (
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
                        <p className="text-[11px] mt-0.5 text-gray-500 tabular-nums">
                          Acum.: {formatCurrency(runningTotals.get(contribution.id) ?? 0)}
                        </p>
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
          registeredByName={getRegisteredByName(detailContribution)}
          onClose={() => setDetailId(null)}
          onEdit={() => handleEditContribution(detailContribution)}
          canEdit={currentUser?.role !== 'collaborator'}
        />
      )}

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
