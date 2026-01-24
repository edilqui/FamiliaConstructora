import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, cn } from '../lib/utils';
import {
  Plus, Minus, Wallet, Loader2, TrendingUp, TrendingDown,
  BarChart3, Filter, X, PieChart as PieIcon, Check, Users
} from 'lucide-react';
import TransactionForm from './TransactionForm';
import ContributionForm from './ContributionForm';
import InitializeDataPanel from '../components/InitializeDataPanel';
import { useAuthStore } from '../store/useAuthStore';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, categories, transactions, totalInBox, userStats, projectStats, loading } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);

  // Estados de Modales
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Analytics states
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Inicializar proyectos seleccionados
  useEffect(() => {
    if (projects.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects(projects.map(p => p.id));
    }
  }, [projects, selectedProjects.length]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // --- LÓGICA DE DATOS ---
  const filteredExpenses = useMemo(() => {
    return transactions.filter(
      t => t.type === 'expense' && t.projectId && selectedProjects.includes(t.projectId)
    );
  }, [transactions, selectedProjects]);

  const expenseTrendData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);
    const intervals = timePeriod === 'weekly' 
      ? eachWeekOfInterval({ start: sixMonthsAgo, end: now }, { weekStartsOn: 1 })
      : eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    return intervals.map(start => {
      const end = timePeriod === 'weekly' ? endOfWeek(start, { weekStartsOn: 1 }) : endOfMonth(start);
      const periodExpenses = filteredExpenses.filter(t => isWithinInterval(t.date, { start, end }));
      const total = periodExpenses.reduce((sum, t) => sum + t.amount, 0);
      return {
        period: format(start, timePeriod === 'weekly' ? 'dd MMM' : 'MMM', { locale: es }),
        total,
      };
    }).filter(d => d.total > 0).slice(-6);
  }, [filteredExpenses, timePeriod]);

  const categoryDistributionData = useMemo(() => {
    const totals = new Map<string, number>();
    filteredExpenses.forEach(t => {
      if (t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
    });
    return Array.from(totals.entries())
      .map(([id, val]) => ({ name: categories.find(c => c.id === id)?.name || 'Otros', value: val }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredExpenses, categories]);

  // Cálculo de progreso de aportes por usuario basado en presupuestos
  const userContributionProgress = useMemo(() => {
    // Calcular presupuesto efectivo por proyecto
    // Si un proyecto tiene budget = 0, usar la suma de sus gastos
    const effectiveBudgetTotal = projects.reduce((sum, project) => {
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

    // Calcular cuánto le corresponde a cada usuario (dividir equitativamente)
    const numberOfUsers = userStats.length || 4;
    const expectedPerUser = effectiveBudgetTotal / numberOfUsers;

    return userStats.map(stats => {
      const contributed = stats.totalContributed;
      const expected = expectedPerUser;
      const remaining = Math.max(0, expected - contributed);
      const percentage = expected > 0 ? (contributed / expected) * 100 : 0;

      return {
        name: stats.userName,
        contributed,
        remaining,
        expected,
        percentage: Math.min(100, percentage), // Cap at 100%
        isCurrentUser: stats.userId === currentUser?.id,
      };
    }).sort((a, b) => b.percentage - a.percentage); // Ordenar por porcentaje descendente
  }, [userStats, projects, transactions, currentUser]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const toggleAllProjects = () => {
    setSelectedProjects(selectedProjects.length === projects.length ? [] : projects.map(p => p.id));
  };

  const hasActiveFilters = selectedProjects.length < projects.length;

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const myStats = userStats.find(s => s.userId === currentUser?.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* --- HEADER (Limpio) --- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        {/* Aquí ya no está el botón de filtros */}
      </header>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto">
        
        {/* --- TARJETA PRINCIPAL (Total en Caja) --- */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl p-6">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-gray-300">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">Total Disponible</span>
            </div>
            <p className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(totalInBox)}</p>
            
            {myStats && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tu Balance</p>
                  <div className={cn("flex items-center gap-1.5 font-bold", myStats.balance >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {myStats.balance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{formatCurrency(Math.abs(myStats.balance))}</span>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-400 mb-0.5">Aportado</p>
                   <p className="font-semibold">{formatCurrency(myStats.totalContributed)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CHARTS SECTION --- */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Gráfico de Barras (Tendencia) CON BOTÓN DE FILTRO */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Gráfico de Gastos</h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {timePeriod === 'weekly' ? 'Vista Semanal' : 'Vista Mensual'}
                    </p>
                  </div>
                </div>

                {/* BOTÓN DE FILTRO INTEGRADO AQUÍ */}
                <button 
                  onClick={() => setShowFilterModal(true)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors relative"
                  aria-label="Filtrar Gráfico"
                >
                  <Filter className="w-4 h-4" />
                  {hasActiveFilters && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                  )}
                </button>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} dy={10} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Circular (Categorías) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <PieIcon className="w-4 h-4" />
                  </div>
                <h3 className="font-bold text-gray-800 text-sm">Top Categorías</h3>
              </div>
              <div className="flex items-center">
                <div className="h-40 w-40 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistributionData}
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-xs font-bold text-gray-400">Distr.</span>
                  </div>
                </div>

                <div className="flex-1 pl-4 space-y-2">
                  {categoryDistributionData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                        <span className="text-gray-600 truncate max-w-[80px]">{entry.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{((entry.value / filteredExpenses.reduce((a,b)=>a+b.amount,0)) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico de Progreso de Aportes por Usuario */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Progreso de Aportes</h3>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Basado en presupuestos ({formatCurrency(
                      projects.reduce((sum, project) => {
                        if (project.budget > 0) return sum + project.budget;
                        const projectExpenses = transactions
                          .filter(t => t.type === 'expense' && t.projectId === project.id)
                          .reduce((expSum, t) => expSum + t.amount, 0);
                        return sum + projectExpenses;
                      }, 0)
                    )})
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {userContributionProgress.map((user, index) => (
                  <div key={index} className={cn(
                    "p-3 rounded-xl border transition-all",
                    user.isCurrentUser ? "bg-blue-50/50 border-blue-200" : "bg-gray-50 border-gray-100"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                          user.isCurrentUser ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
                        )}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className={cn(
                            "text-sm font-bold",
                            user.isCurrentUser ? "text-blue-900" : "text-gray-800"
                          )}>
                            {user.name} {user.isCurrentUser && '(Tú)'}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {formatCurrency(user.contributed)} / {formatCurrency(user.expected)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-bold",
                          user.percentage >= 100 ? "text-emerald-600" :
                          user.percentage >= 50 ? "text-blue-600" : "text-amber-600"
                        )}>
                          {user.percentage.toFixed(0)}%
                        </p>
                        {user.remaining > 0 && (
                          <p className="text-[10px] text-gray-500">
                            Falta: {formatCurrency(user.remaining)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          user.percentage >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                          user.percentage >= 50 ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                          "bg-gradient-to-r from-amber-500 to-amber-600"
                        )}
                        style={{ width: `${Math.min(100, user.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Info adicional */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>100%+</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>50-99%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>&lt;50%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center opacity-60">
             <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
             <p className="text-sm">No hay datos suficientes para los gráficos</p>
          </div>
        )}

        {/* --- ACCESOS RÁPIDOS A PROYECTOS --- */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Proyectos Activos</h3>
          <div className="grid grid-cols-2 gap-3">
             {projectStats.slice(0, 4).map(stat => (
               <button 
                 key={stat.projectId}
                 onClick={() => navigate(`/project/${stat.projectId}`)}
                 className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-left hover:border-blue-300 transition-all"
               >
                 <p className="text-sm font-bold text-gray-800 truncate mb-1">{stat.projectName}</p>
                 <p className="text-xs text-gray-500">{stat.transactionCount} movs.</p>
                 <p className="text-sm font-bold text-blue-600 mt-1">{formatCurrency(stat.totalSpent)}</p>
               </button>
             ))}
             {projects.length === 0 && <InitializeDataPanel />}
          </div>
        </div>

      </div>

      {/* --- FAB UNIFICADO --- */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {isFabOpen && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-1">
            <button 
              onClick={() => { setShowContributionForm(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 pr-1 group"
            >
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                Ingreso
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
            </button>
            <button 
              onClick={() => { setShowExpenseForm(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 pr-1 group"
            >
              <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                Gasto
              </span>
              <div className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                <Minus className="w-6 h-6" />
              </div>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 bg-gray-900 text-white",
            isFabOpen && "rotate-45"
          )}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* --- MODAL DE FILTROS (BOTTOM SHEET) --- */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowFilterModal(false)}
          />
          
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Configurar Gráfico</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Período de Tiempo</label>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  {['weekly', 'monthly'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setTimePeriod(p as any)}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                        timePeriod === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {p === 'weekly' ? 'Semanal' : 'Mensual'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Proyectos Incluidos</label>
                  <button onClick={toggleAllProjects} className="text-xs font-medium text-blue-600">
                    {selectedProjects.length === projects.length ? 'Ocultar todos' : 'Ver todos'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {projects.map(p => (
                    <label 
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                        selectedProjects.includes(p.id) 
                          ? "border-blue-500 bg-blue-50/50" 
                          : "border-gray-100 bg-white"
                      )}
                    >
                      <span className={cn("text-sm font-medium", selectedProjects.includes(p.id) ? "text-blue-900" : "text-gray-600")}>
                        {p.name}
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                        selectedProjects.includes(p.id) 
                          ? "bg-blue-500 border-blue-500" 
                          : "border-gray-300 bg-white"
                      )}>
                        {selectedProjects.includes(p.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={selectedProjects.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowFilterModal(false)}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl mt-6 active:scale-95 transition-transform"
            >
              Aplicar Configuración
            </button>
          </div>
        </div>
      )}

      {/* Transaction Modals */}
      {showExpenseForm && <TransactionForm onClose={() => setShowExpenseForm(false)} />}
      {showContributionForm && <ContributionForm onClose={() => setShowContributionForm(false)} />}
    </div>
  );
}