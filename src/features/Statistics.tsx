import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatDate } from '../lib/utils';
import { Loader2, TrendingUp, Receipt, Users, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Statistics() {
  const { userStats, projectStats, transactions, totalInBox, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Calcular totales
  const totalContributions = transactions
    .filter((t) => t.type === 'contribution')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Últimas transacciones
  const recentTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas Generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border-2 border-green-500 p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500 rounded-full">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700">Total Aportes</h3>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {formatCurrency(totalContributions)}
            </p>
          </div>

          <div className="bg-red-50 border-2 border-red-500 p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500 rounded-full">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700">Total Gastos</h3>
            </div>
            <p className="text-3xl font-bold text-red-700">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-500 p-5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500 rounded-full">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-700">En Caja</h3>
            </div>
            <p className="text-3xl font-bold text-blue-700">
              {formatCurrency(totalInBox)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Aportes por Usuario */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-800">Detalle por Hermano</h2>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hermano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aportado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Su parte (25%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.map((stat) => (
                <tr key={stat.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{stat.userName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-green-600 font-semibold">
                      {formatCurrency(stat.totalContributed)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">
                      {formatCurrency(stat.share)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={cn(
                        'font-semibold',
                        stat.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(Math.abs(stat.balance))}
                      {stat.balance >= 0 ? ' a favor' : ' debe'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Gastos por Proyecto */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-800">Detalle por Proyecto</h2>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Gastado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  # Transacciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectStats.map((stat) => {
                const percentage = totalExpenses > 0 ? (stat.totalSpent / totalExpenses) * 100 : 0;

                return (
                  <tr key={stat.projectId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{stat.projectName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-red-600 font-semibold">
                        {formatCurrency(stat.totalSpent)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{stat.transactionCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{percentage.toFixed(1)}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Transacciones */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Últimas Transacciones</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                        transaction.type === 'contribution'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}
                    >
                      {transaction.type === 'contribution' ? 'Aporte' : 'Gasto'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{transaction.description}</div>
                    <div className="text-sm text-gray-500">{transaction.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        transaction.type === 'contribution' ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {transaction.type === 'contribution' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
