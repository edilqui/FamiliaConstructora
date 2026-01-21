import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { Plus, TrendingUp, Wallet, Loader2 } from 'lucide-react';
import TransactionForm from './TransactionForm';

export default function Dashboard() {
  const { projects, globalBalance, userBalance, loading } = useDashboardData();
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarjeta Personal */}
        <div
          className={cn(
            'p-6 rounded-lg shadow-md',
            userBalance >= 0
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'p-2 rounded-full',
                userBalance >= 0 ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Tu Balance</h2>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              userBalance >= 0 ? 'text-green-700' : 'text-red-700'
            )}
          >
            {formatCurrency(Math.abs(userBalance))}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {userBalance >= 0 ? 'A tu favor' : 'Debes aportar'}
          </p>
        </div>

        {/* Tarjeta Global */}
        <div className="bg-blue-50 border-2 border-blue-500 p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-blue-500">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Caja Global</h2>
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {formatCurrency(globalBalance)}
          </p>
          <p className="text-sm text-gray-600 mt-1">Disponible</p>
        </div>
      </div>

      {/* Proyectos */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Proyectos</h2>

        {projects.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            <p>No hay proyectos aún</p>
            <p className="text-sm mt-2">Los proyectos aparecerán aquí una vez creados en Firestore</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const progress = (project.totalSpent / project.budget) * 100;
              const isOverBudget = progress > 100;

              return (
                <div
                  key={project.id}
                  className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{project.name}</h3>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gastado</span>
                      <span className="font-semibold">
                        {formatCurrency(project.totalSpent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Presupuesto</span>
                      <span className="font-semibold">
                        {formatCurrency(project.budget)}
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={cn(
                            'h-2.5 rounded-full transition-all',
                            isOverBudget ? 'bg-red-600' : 'bg-primary-600'
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p
                        className={cn(
                          'text-xs text-right mt-1',
                          isOverBudget ? 'text-red-600 font-semibold' : 'text-gray-600'
                        )}
                      >
                        {progress.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-20"
        aria-label="Agregar gasto"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Transaction Form Modal */}
      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
