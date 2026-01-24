import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { Plus, Minus, Wallet, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import TransactionForm from './TransactionForm';
import ContributionForm from './ContributionForm';
import InitializeDataPanel from '../components/InitializeDataPanel';
import { useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, totalInBox, userStats, projectStats, loading } = useDashboardData();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Obtener estadísticas del usuario actual
  const myStats = userStats.find(s => s.userId === currentUser?.id);

  return (
    <div className="space-y-6 pb-24">
      {/* Total en Caja */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6" />
          <h2 className="text-lg font-semibold">Total en Caja</h2>
        </div>
        <p className="text-4xl font-bold">{formatCurrency(totalInBox)}</p>
        <p className="text-sm text-blue-100 mt-2">Disponible para gastos</p>
      </div>

      {/* Balance Personal */}
      {myStats && (
        <div
          className={cn(
            'p-6 rounded-lg shadow-md',
            myStats.balance >= 0
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'p-2 rounded-full',
                myStats.balance >= 0 ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              {myStats.balance >= 0 ? (
                <TrendingUp className="w-5 h-5 text-white" />
              ) : (
                <TrendingDown className="w-5 h-5 text-white" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Tu Balance</h2>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              myStats.balance >= 0 ? 'text-green-700' : 'text-red-700'
            )}
          >
            {formatCurrency(Math.abs(myStats.balance))}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {myStats.balance >= 0 ? 'A tu favor' : 'Debes aportar'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Aportado</p>
              <p className="font-semibold text-gray-800">{formatCurrency(myStats.totalContributed)}</p>
            </div>
            <div>
              <p className="text-gray-600">Tu parte (25%)</p>
              <p className="font-semibold text-gray-800">{formatCurrency(myStats.share)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Aportes por Usuario */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Aportes por Hermano</h2>
        {userStats.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            <p>No hay aportes registrados aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.map((stat) => {
              const isCurrentUser = stat.userId === currentUser?.id;

              return (
                <div
                  key={stat.userId}
                  className={cn(
                    'bg-white p-4 rounded-lg shadow-md',
                    isCurrentUser && 'ring-2 ring-primary-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {stat.userName}
                      {isCurrentUser && <span className="text-primary-600 ml-1">(Tú)</span>}
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stat.totalContributed)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Aportado</p>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600">
                      Balance:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          stat.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {formatCurrency(Math.abs(stat.balance))}
                        {stat.balance >= 0 ? ' a favor' : ' debe'}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proyectos */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gastos por Proyecto</h2>

        {projects.length === 0 ? (
          <InitializeDataPanel />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectStats.map((stat) => {
              const project = projects.find(p => p.id === stat.projectId);
              if (!project) return null;

              return (
                <button
                  key={stat.projectId}
                  onClick={() => navigate(`/project/${stat.projectId}`)}
                  className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-all text-left w-full cursor-pointer hover:border-2 hover:border-primary-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{stat.projectName}</h3>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        project.status === 'active' && 'bg-green-100 text-green-700',
                        project.status === 'completed' && 'bg-blue-100 text-blue-700',
                        project.status === 'paused' && 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {project.status === 'active' && 'Activo'}
                      {project.status === 'completed' && 'Completado'}
                      {project.status === 'paused' && 'Pausado'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(stat.totalSpent)}
                      </p>
                      <p className="text-xs text-gray-500">Gastado</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600">
                        {stat.transactionCount} {stat.transactionCount === 1 ? 'gasto' : 'gastos'} registrados
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FABs - Floating Action Buttons */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 flex flex-col gap-3 z-40">
        {/* FAB Aporte (Verde) */}
        <button
          onClick={() => setShowContributionForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="Agregar aporte"
          title="Agregar Aporte"
        >
          <Plus className="w-6 h-6" />
          <span className="absolute right-16 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Agregar Aporte
          </span>
        </button>

        {/* FAB Gasto (Rojo) */}
        <button
          onClick={() => setShowExpenseForm(true)}
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="Agregar gasto"
          title="Agregar Gasto"
        >
          <Minus className="w-6 h-6" />
          <span className="absolute right-16 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Agregar Gasto
          </span>
        </button>
      </div>

      {/* Modals */}
      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
    </div>
  );
}
