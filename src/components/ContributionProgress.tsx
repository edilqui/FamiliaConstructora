import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuthStore } from '../store/useAuthStore';
import { cn, formatCurrency } from '../lib/utils';

// Avance de cada miembro frente a su parte del presupuesto total
export default function ContributionProgress() {
  const navigate = useNavigate();
  const { projects, transactions, memberStats, collaboratorStats, memberCount } = useDashboardData();
  const currentUser = useAuthStore((state) => state.user);

  const budgetTotal = useMemo(() =>
    projects.reduce((sum, project) => {
      if (project.budget > 0) return sum + project.budget;
      return sum + transactions
        .filter((t) => t.type === 'expense' && t.projectId === project.id)
        .reduce((s, t) => s + t.amount, 0);
    }, 0),
    [projects, transactions],
  );

  const members = useMemo(() => {
    const expected = budgetTotal / (memberCount || 4);
    return memberStats.map((stats) => {
      const percentage = expected > 0 ? (stats.totalContributed / expected) * 100 : 0;
      return {
        userId: stats.userId,
        name: stats.userName,
        contributed: stats.totalContributed,
        expected,
        remaining: Math.max(0, expected - stats.totalContributed),
        percentage: Math.min(100, percentage),
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [memberStats, memberCount, budgetTotal]);

  if (members.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-start gap-2 mb-3">
        <Users className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-bold text-gray-800">Progreso de aportes</h3>
          <p className="text-xs text-gray-500">{formatCurrency(budgetTotal)} de presupuesto entre {memberCount} miembros</p>
        </div>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <button
            key={member.userId}
            onClick={() => navigate(`/user/${member.userId}/contributions`)}
            className={cn(
              'w-full p-3 rounded-xl border text-left active:bg-gray-100 transition-colors',
              member.userId === currentUser?.id ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-100',
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {member.name}{member.userId === currentUser?.id && ' (Tú)'}
                </p>
                <p className="text-xs text-gray-500 tabular-nums">{formatCurrency(member.contributed)} de {formatCurrency(member.expected)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900 leading-tight">{member.percentage.toFixed(0)}%</p>
                {member.remaining > 0 && <p className="text-xs text-gray-500 tabular-nums">Falta {formatCurrency(member.remaining)}</p>}
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${member.percentage}%` }} />
            </div>
          </button>
        ))}
      </div>

      {collaboratorStats.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Colaboradores</p>
          <div className="space-y-2">
            {collaboratorStats.map((stats) => (
              <button
                key={stats.userId}
                onClick={() => navigate(`/user/${stats.userId}/contributions`)}
                className="w-full min-h-11 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2 text-left active:bg-gray-100"
              >
                <span className="text-sm font-semibold text-gray-800 truncate">{stats.userName}</span>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(stats.totalContributed)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
