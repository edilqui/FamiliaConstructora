import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useBrassGame, formatMs } from '../hooks/useBrassGame';
import { STANDARD_ROUNDS_PER_ERA } from '../services/brassService';
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  History,
  Trash2,
  Dices,
  Trophy,
  Minus,
  Plus,
  Coins,
  TrainFront,
  Waves
} from 'lucide-react';
import type { User, BrassPlayer } from '../types';
import { cn } from '../lib/utils';
import { useScrollAwareHeader } from '../hooks/useScrollAwareHeader';
import { useModalHistory } from '../hooks/useModalHistory';

const TURN_LIMIT_PRESETS = [60, 90, 120, 180];

const eraLabel = (era: 'canal' | 'rail') =>
  era === 'canal' ? 'Era de Canales' : 'Era de Ferrocarril';

// Mismo reorden estable que aplica el servidor, para la vista previa del modal de gastos
const previewOrder = (players: BrassPlayer[], spending: Record<string, number>) =>
  players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (spending[a.p.userId] || 0) - (spending[b.p.userId] || 0) || a.i - b.i)
    .map((x) => x.p);

export default function BrassBirmingham() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const {
    game,
    loading,
    elapsedMs,
    limitMs,
    overtimeMs,
    canUndo,
    startGame,
    pause,
    resume,
    nextPlayer,
    undo,
    submitSpending,
    continueToRail,
    endAtCanal,
    submitScores,
    discard
  } = useBrassGame(user?.id);

  // --- Estado del setup ---
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // el orden de selección = orden de turno inicial
  const [turnLimitSec, setTurnLimitSec] = useState(120);
  const [roundsPerEra, setRoundsPerEra] = useState(8);
  const [starting, setStarting] = useState(false);

  // --- Estado de modales ---
  const [spendingInput, setSpendingInput] = useState<Record<string, string>>({});
  const [pointsInput, setPointsInput] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // El atrás del sistema cierra la confirmación en lugar de salir de la pantalla
  useModalHistory(showDiscardConfirm, () => setShowDiscardConfirm(false));

  const { hidden: headerHidden, spacerHeight, headerRef } = useScrollAwareHeader();

  // Usuarios aprobados para el setup (miembros primero)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), where('approved', '==', true));
    return onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          name: data.name || 'Usuario',
          email: data.email || '',
          approved: true,
          role: data.role || 'member'
        });
      });
      users.sort((a, b) =>
        a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'member' ? -1 : 1
      );
      setAvailableUsers(users);
    });
  }, [user]);

  // Rondas estándar según cantidad de jugadores seleccionados
  useEffect(() => {
    setRoundsPerEra(STANDARD_ROUNDS_PER_ERA[selectedIds.length] || 8);
  }, [selectedIds.length]);

  // Limpiar inputs de los modales cuando cambia la fase
  useEffect(() => {
    setSpendingInput({});
    setPointsInput({});
  }, [game?.phase, game?.round, game?.era]);

  // Solo miembros pueden usar la herramienta
  if (user && user.role !== 'member') {
    return <Navigate to="/settings" replace />;
  }

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleStart = async () => {
    if (selectedIds.length < 2) return;
    setStarting(true);
    try {
      const players = selectedIds.map((id) => {
        const u = availableUsers.find((x) => x.id === id)!;
        return { userId: u.id, name: u.name };
      });
      await startGame(players, turnLimitSec, roundsPerEra);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error al iniciar partida:', err);
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitSpending = async () => {
    if (!game) return;
    setSaving(true);
    try {
      const spending: Record<string, number> = {};
      game.players.forEach((p) => {
        spending[p.userId] = Math.max(0, parseInt(spendingInput[p.userId] || '0', 10) || 0);
      });
      await submitSpending(spending);
    } catch (err) {
      console.error('Error al registrar gastos:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitScores = async () => {
    if (!game) return;
    setSaving(true);
    try {
      const points: Record<string, number> = {};
      game.players.forEach((p) => {
        points[p.userId] = Math.max(0, parseInt(pointsInput[p.userId] || '0', 10) || 0);
      });
      await submitScores(points);
      navigate('/settings/brass/history');
    } catch (err) {
      console.error('Error al guardar la partida:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    setSaving(true);
    try {
      await discard();
      setShowDiscardConfirm(false);
    } catch (err) {
      console.error('Error al descartar partida:', err);
    } finally {
      setSaving(false);
    }
  };

  const currentPlayer = game?.players[game.currentPlayerIndex];
  const isPaused = game?.phase === 'paused';
  const inOvertime = overtimeMs > 0;
  const nearLimit = !inOvertime && elapsedMs >= limitMs * 0.8;

  // Numérico ya parseado para la vista previa del reorden
  const parsedSpending: Record<string, number> = {};
  if (game) {
    game.players.forEach((p) => {
      parsedSpending[p.userId] = Math.max(0, parseInt(spendingInput[p.userId] || '0', 10) || 0);
    });
  }

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
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Brass Birmingham</h1>
          <p className="text-xs lg:text-sm text-gray-500">
            {game
              ? `${eraLabel(game.era)} · Ronda ${game.round}/${game.roundsPerEra}`
              : 'Cronómetro y registro de partidas'}
          </p>
        </div>
        <button
          onClick={() => navigate('/settings/brass/history')}
          className="p-2 hover:bg-amber-50 rounded-full transition-colors"
          aria-label="Ver histórico"
        >
          <History className="w-5 h-5 text-amber-600" />
        </button>
        {game && (
          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="p-2 hover:bg-red-50 rounded-full transition-colors"
            aria-label="Descartar partida"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
        )}
      </header>
      <div style={{ height: spacerHeight }} />

      <div className="px-4 lg:px-8 pt-6 max-w-3xl mx-auto space-y-6">
        {/* --- LOADING --- */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        )}

        {/* --- SETUP: NO HAY PARTIDA ACTIVA --- */}
        {!loading && !game && (
          <>
            <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-5 shadow-lg flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Dices className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Nueva partida</h2>
                <p className="text-sm text-amber-100">
                  Elige los jugadores en su orden de turno inicial
                </p>
              </div>
            </div>

            {/* Selección de jugadores */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Jugadores ({selectedIds.length}/4)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toca en el orden en que jugarán la primera ronda
                </p>
              </div>
              {availableUsers.map((u) => {
                const orderIndex = selectedIds.indexOf(u.id);
                const selected = orderIndex >= 0;
                return (
                  <button
                    key={u.id}
                    onClick={() => togglePlayer(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 border-b border-gray-50 last:border-b-0 transition-colors',
                      selected ? 'bg-amber-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        selected ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {selected ? orderIndex + 1 : u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {u.role === 'collaborator' ? 'Colaborador' : 'Miembro'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Límite de turno */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Límite por turno</h3>
              <div className="flex gap-2">
                {TURN_LIMIT_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setTurnLimitSec(sec)}
                    className={cn(
                      'flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95',
                      turnLimitSec === sec
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {formatMs(sec * 1000)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Al superarlo suena un pitido, pero el tiempo sigue contando
              </p>
            </div>

            {/* Rondas por era */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Rondas por era</h3>
                  {selectedIds.length >= 2 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Estándar para {selectedIds.length} jugadores:{' '}
                      {STANDARD_ROUNDS_PER_ERA[selectedIds.length]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRoundsPerEra((r) => Math.max(1, r - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-8 text-center tabular-nums">
                    {roundsPerEra}
                  </span>
                  <button
                    onClick={() => setRoundsPerEra((r) => Math.min(12, r + 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={selectedIds.length < 2 || starting}
              className="w-full h-16 bg-amber-600 text-white rounded-2xl text-xl font-bold shadow-md hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {starting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Iniciar partida
                </>
              )}
            </button>
          </>
        )}

        {/* --- PARTIDA EN VIVO --- */}
        {!loading && game && currentPlayer && (
          <>
            {/* Cronómetro */}
            <div
              className={cn(
                'rounded-3xl p-6 shadow-lg text-center transition-colors',
                inOvertime
                  ? 'bg-gradient-to-br from-red-600 to-red-700'
                  : nearLimit
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-700'
              )}
            >
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">
                Turno de
              </p>
              <h2 className="text-2xl font-bold text-white mt-1">{currentPlayer.name}</h2>
              <p
                className={cn(
                  'text-7xl font-bold text-white tabular-nums mt-3',
                  inOvertime && !isPaused && 'animate-pulse'
                )}
              >
                {formatMs(elapsedMs)}
              </p>
              {inOvertime && (
                <p className="text-sm font-semibold text-white/90 mt-1">
                  +{formatMs(overtimeMs)} sobre el límite
                </p>
              )}
              {!inOvertime && (
                <p className="text-sm text-white/70 mt-1">Límite: {formatMs(limitMs)}</p>
              )}
              {isPaused && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                  <Pause className="w-4 h-4" />
                  Pausado
                </div>
              )}
            </div>

            {/* Deshacer avance accidental */}
            {canUndo && (
              <button
                onClick={undo}
                className="w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Deshacer último cambio de turno
              </button>
            )}

            {/* Botones principales */}
            <div className="space-y-3">
              <button
                onClick={nextPlayer}
                className="w-full h-16 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <SkipForward className="w-6 h-6" />
                Siguiente jugador
              </button>
              <button
                onClick={isPaused ? resume : pause}
                className={cn(
                  'w-full h-14 rounded-2xl text-lg font-semibold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2',
                  isPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    Reanudar
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    Pausar
                  </>
                )}
              </button>
            </div>

            {/* Orden de turno con tiempos acumulados */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Orden de turno</h3>
              </div>
              {game.players.map((p, i) => {
                const isActive = i === game.currentPlayerIndex;
                return (
                  <div
                    key={p.userId}
                    className={cn(
                      'flex items-center gap-3 p-4 border-b border-gray-50 last:border-b-0',
                      isActive && 'bg-blue-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {i + 1}
                    </div>
                    <p
                      className={cn(
                        'flex-1 text-sm',
                        isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                      )}
                    >
                      {p.name}
                    </p>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 tabular-nums">
                        {formatMs(p.totalTimeMs + (isActive ? elapsedMs : 0))}
                      </p>
                      {p.overtimeCount > 0 && (
                        <p className="text-[11px] text-red-500">
                          {p.overtimeCount} {p.overtimeCount === 1 ? 'vez' : 'veces'} sobre el
                          límite
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* --- MODAL: GASTOS DE LA RONDA --- */}
      {game && game.phase === 'roundEnd' && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Fin de la ronda {game.round}
                  </h3>
                  <p className="text-xs text-gray-500">
                    ¿Cuánto gastó cada uno? El que menos gastó juega primero
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {game.players.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3">
                    <p className="flex-1 text-sm font-medium text-gray-900">{p.name}</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        £
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={spendingInput[p.userId] || ''}
                        onChange={(e) =>
                          setSpendingInput((prev) => ({
                            ...prev,
                            [p.userId]: e.target.value.replace(/\D/g, '')
                          }))
                        }
                        placeholder="0"
                        className="w-24 pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-right tabular-nums focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista previa del nuevo orden */}
              <div className="mt-4 bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Nuevo orden
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {previewOrder(game.players, parsedSpending).map((p, i) => (
                    <span
                      key={p.userId}
                      className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      <span className="text-amber-600 font-bold">{i + 1}.</span>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmitSpending}
                disabled={saving}
                className="w-full mt-5 px-4 py-3.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : game.round < game.roundsPerEra ? (
                  'Confirmar y empezar siguiente ronda'
                ) : (
                  'Confirmar orden'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: FIN DE LA ERA DE CANALES --- */}
      {game && game.phase === 'eraEnd' && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Waves className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¡Terminó la Era de Canales!
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                ¿Continúan con la Era de Ferrocarril o el juego termina aquí?
              </p>
              <div className="space-y-3">
                <button
                  onClick={continueToRail}
                  className="w-full px-4 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <TrainFront className="w-5 h-5" />
                  Jugar Era de Ferrocarril
                </button>
                <button
                  onClick={endAtCanal}
                  className="w-full px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Terminar aquí y contar puntos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: PUNTOS DE VICTORIA FINALES --- */}
      {game && game.phase === 'scoring' && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">¡Fin de la partida!</h3>
                  <p className="text-xs text-gray-500">
                    Ingresa los puntos de victoria de cada jugador
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {game.players.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3">
                    <p className="flex-1 text-sm font-medium text-gray-900">{p.name}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pointsInput[p.userId] || ''}
                      onChange={(e) =>
                        setPointsInput((prev) => ({
                          ...prev,
                          [p.userId]: e.target.value.replace(/\D/g, '')
                        }))
                      }
                      placeholder="0"
                      className="w-24 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-right tabular-nums focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                    />
                    <span className="text-xs text-gray-400 w-6">PV</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitScores}
                disabled={saving}
                className="w-full mt-5 px-4 py-3.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Guardar partida en el histórico'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRMAR DESCARTE --- */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDiscardConfirm(false)}
          />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Descartar la partida?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Se cerrará para todos los jugadores y no quedará en el histórico
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Descartar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
