import { useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { Scale, TrendingUp, TrendingDown, User, ArrowUpCircle, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Balance() {
  const { userStats, transactions, totalExpenses, totalInBox } = useDashboardData();
  const user = useAuthStore((state) => state.user);

  // Obtener balance del usuario actual
  const currentUserStats = useMemo(() => {
    return userStats.find((stats) => stats.userId === user?.id);
  }, [userStats, user]);

  // Obtener historial de aportes del usuario actual
  const userContributions = useMemo(() => {
    if (!user) return [];

    return transactions
      .filter((t) => t.type === 'contribution' && t.userId === user.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10); // Últimos 10 aportes
  }, [transactions, user]);

  // Calcular cuánto debe aportar para estar al día
  const amountToCatchUp = useMemo(() => {
    if (!currentUserStats) return 0;
    return currentUserStats.balance < 0 ? Math.abs(currentUserStats.balance) : 0;
  }, [currentUserStats]);

  // Calcular próximo aporte recomendado (25% del saldo en caja si debe)
  const recommendedContribution = useMemo(() => {
    if (amountToCatchUp === 0) return 0;
    // Recomendar cubrir la deuda o aportar al menos el 25% del total en caja
    return Math.max(amountToCatchUp, totalInBox * 0.25);
  }, [amountToCatchUp, totalInBox]);

  if (!currentUserStats || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando datos...</p>
      </div>
    );
  }

  const isInDebt = currentUserStats.balance < 0;
  const isCurrent = Math.abs(currentUserStats.balance) < 1; // Menos de $1 de diferencia

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-full">
          <Scale className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mi Balance</h1>
          <p className="text-sm text-gray-600">Estado financiero personal</p>
        </div>
      </div>

      {/* Balance Personal Destacado */}
      <div
        className={cn(
          'border-3 rounded-xl p-6 shadow-lg',
          isInDebt
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
            : isCurrent
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
            : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          {isInDebt ? (
            <AlertCircle className="w-6 h-6 text-red-600" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          )}
          <h2 className="text-lg font-bold text-gray-800">
            {isInDebt ? 'Tienes una deuda' : isCurrent ? 'Estás al día' : 'Estás a favor'}
          </h2>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tu balance actual</p>
            <p
              className={cn(
                'text-5xl font-bold',
                isInDebt ? 'text-red-700' : isCurrent ? 'text-blue-700' : 'text-green-700'
              )}
            >
              {formatCurrency(Math.abs(currentUserStats.balance))}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {isInDebt ? 'Debes aportar' : isCurrent ? 'Equilibrado' : 'A tu favor'}
            </p>
          </div>

          {isInDebt ? (
            <TrendingDown className="w-16 h-16 text-red-400 opacity-50" />
          ) : (
            <TrendingUp className="w-16 h-16 text-green-400 opacity-50" />
          )}
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-300">
          <div>
            <p className="text-xs text-gray-600 mb-1">Has aportado</p>
            <p className="text-xl font-bold text-gray-800">
              {formatCurrency(currentUserStats.totalContributed)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Tu cuota (25%)</p>
            <p className="text-xl font-bold text-gray-800">
              {formatCurrency(currentUserStats.share)}
            </p>
          </div>
        </div>
      </div>

      {/* Recomendación de Aporte */}
      {isInDebt && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">Aporte Recomendado</h3>
              <p className="text-sm text-gray-700 mb-2">
                Para ponerte al día con tus hermanos, te recomendamos aportar:
              </p>
              <p className="text-2xl font-bold text-yellow-700">
                {formatCurrency(recommendedContribution)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Esto cubrirá tu deuda actual de {formatCurrency(amountToCatchUp)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparativa con Hermanos */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-600" />
          Balance de Todos los Hermanos
        </h3>

        <div className="space-y-3">
          {userStats.map((stats) => {
            const isCurrentUser = stats.userId === user.id;
            const userIsInDebt = stats.balance < 0;
            const userIsCurrent = Math.abs(stats.balance) < 1;

            return (
              <div
                key={stats.userId}
                className={cn(
                  'border-2 rounded-lg p-4 transition-all',
                  isCurrentUser
                    ? 'bg-primary-50 border-primary-300 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <p className="font-bold text-gray-800">
                        {stats.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                            Tú
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Aportado</p>
                        <p className="font-semibold text-gray-700">
                          {formatCurrency(stats.totalContributed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cuota (25%)</p>
                        <p className="font-semibold text-gray-700">
                          {formatCurrency(stats.share)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Balance</p>
                    <div className="flex items-center gap-2">
                      {userIsInDebt ? (
                        <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : userIsCurrent ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                      <p
                        className={cn(
                          'text-xl font-bold',
                          userIsInDebt
                            ? 'text-red-600'
                            : userIsCurrent
                            ? 'text-blue-600'
                            : 'text-green-600'
                        )}
                      >
                        {userIsInDebt ? '-' : '+'}{formatCurrency(Math.abs(stats.balance))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen General */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">En Caja</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(totalInBox)}</p>
          </div>
        </div>
      </div>

      {/* Historial de Mis Aportes */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-green-600" />
          Mis Últimos Aportes
        </h3>

        {userContributions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Aún no has realizado aportes
          </p>
        ) : (
          <div className="space-y-2">
            {userContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{contribution.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(contribution.date, "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
                  </p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  +{formatCurrency(contribution.amount)}
                </p>
              </div>
            ))}
          </div>
        )}

        {userContributions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Total aportado</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(currentUserStats.totalContributed)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
