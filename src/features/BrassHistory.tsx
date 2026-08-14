import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { subscribeToFinishedGames } from '../services/brassService';
import { formatMs } from '../hooks/useBrassGame';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Dices,
  ChevronDown,
  Clock,
  TrainFront,
  Waves
} from 'lucide-react';
import type { BrassGame } from '../types';
import { cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';

const MEDALS = ['🥇', '🥈', '🥉'];

interface PlayerRanking {
  userId: string;
  name: string;
  wins: number;
  gamesPlayed: number;
  avgPoints: number;
}

const buildRanking = (games: BrassGame[]): PlayerRanking[] => {
  const map = new Map<string, { name: string; wins: number; games: number; points: number }>();

  games.forEach((game) => {
    game.players.forEach((p) => {
      const entry = map.get(p.userId) || { name: p.name, wins: 0, games: 0, points: 0 };
      entry.name = p.name;
      entry.games += 1;
      entry.points += p.points || 0;
      if (game.winnerIds?.includes(p.userId)) entry.wins += 1;
      map.set(p.userId, entry);
    });
  });

  return Array.from(map.entries())
    .map(([userId, e]) => ({
      userId,
      name: e.name,
      wins: e.wins,
      gamesPlayed: e.games,
      avgPoints: e.games > 0 ? Math.round(e.points / e.games) : 0
    }))
    .sort((a, b) => b.wins - a.wins || b.avgPoints - a.avgPoints);
};

const formatGameDate = (date?: Date): string =>
  date
    ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

const formatDuration = (ms?: number): string => {
  if (!ms) return '';
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return hours > 0 ? `${hours}h ${min}min` : `${min}min`;
};

export default function BrassHistory() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [games, setGames] = useState<BrassGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToFinishedGames((finishedGames) => {
      setGames(finishedGames);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const ranking = buildRanking(games);

  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
      {/* --- HEADER STICKY --- */}
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 lg:px-8 py-3 lg:py-4 shadow-sm flex items-center gap-3',
          'transition-transform duration-300 ease-in-out',
          headerHidden ? '-translate-y-full' : 'translate-y-0'
        )}
      >
        <button
          onClick={() => navigate('/settings/brass')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Histórico de Brass</h1>
          <p className="text-xs lg:text-sm text-gray-500">Victorias y partidas del grupo</p>
        </div>
        <div className="p-2 bg-amber-100 rounded-full">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-6 max-w-3xl mx-auto space-y-6">
        {/* --- LOADING --- */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        )}

        {/* --- ESTADO VACÍO --- */}
        {!loading && games.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dices className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay partidas</h3>
            <p className="text-sm text-gray-500">
              Cuando terminen su primera partida, aparecerá aquí
            </p>
          </div>
        )}

        {/* --- RANKING DE VICTORIAS --- */}
        {!loading && ranking.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">
              Ranking de victorias
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {ranking.map((r, i) => (
                <div
                  key={r.userId}
                  className="flex items-center gap-3 p-4 border-b border-gray-50 last:border-b-0"
                >
                  <div className="w-8 text-center text-lg flex-shrink-0">
                    {MEDALS[i] || <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {r.gamesPlayed} {r.gamesPlayed === 1 ? 'partida' : 'partidas'} · {r.avgPoints}{' '}
                      PV promedio
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-600 tabular-nums">{r.wins}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {r.wins === 1 ? 'victoria' : 'victorias'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- LISTA DE PARTIDAS --- */}
        {!loading && games.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">
              Partidas ({games.length})
            </h2>
            <div className="space-y-3">
              {games.map((game) => {
                const expanded = expandedId === game.id;
                const winners = game.players.filter((p) => game.winnerIds?.includes(p.userId));
                const sortedPlayers = [...game.players].sort(
                  (a, b) => (a.position || 99) - (b.position || 99)
                );
                return (
                  <div
                    key={game.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : game.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {game.playedRailEra ? (
                          <TrainFront className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Waves className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900">
                          🏆 {winners.map((w) => w.name).join(' y ')}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {formatGameDate(game.finishedAt)} ·{' '}
                          {game.playedRailEra ? 'Canales + Ferrocarril' : 'Solo Canales'}
                          {game.durationMs ? ` · ${formatDuration(game.durationMs)}` : ''}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-gray-400 transition-transform',
                          expanded && 'rotate-180'
                        )}
                      />
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {sortedPlayers.map((p) => (
                          <div key={p.userId} className="p-4 flex items-center gap-3">
                            <div className="w-8 text-center text-base flex-shrink-0">
                              {MEDALS[(p.position || 1) - 1] || (
                                <span className="text-sm font-bold text-gray-400">
                                  {p.position}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatMs(p.totalTimeMs)} total · {formatMs(p.avgTurnMs || 0)}
                                /turno
                                {p.overtimeCount > 0 &&
                                  ` · ${p.overtimeCount} ${
                                    p.overtimeCount === 1 ? 'vez' : 'veces'
                                  } sobre el límite`}
                              </p>
                            </div>
                            <p className="text-base font-bold text-gray-900 tabular-nums">
                              {p.points} <span className="text-xs text-gray-400">PV</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
