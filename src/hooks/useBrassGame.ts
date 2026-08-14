import { useState, useEffect, useRef, useCallback } from 'react';
import type { BrassGame } from '../types';
import {
  subscribeToActiveGame,
  createBrassGame,
  pauseBrassGame,
  resumeBrassGame,
  advanceBrassTurn,
  undoBrassAdvance,
  submitBrassRoundSpending,
  continueToRailEra,
  endGameAtCanalEra,
  finishBrassGame,
  discardBrassGame
} from '../services/brassService';

// AudioContext singleton del módulo. En iOS/Android debe crearse/reanudarse
// dentro de un gesto del usuario para poder sonar después.
let audioCtx: AudioContext | null = null;

export const unlockAudio = () => {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // sin audio disponible; el cronómetro funciona igual
  }
};

const playBeep = () => {
  try {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    // 3 pulsos de 880Hz de 150ms con GainNode para evitar clicks
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      const start = now + i * 0.25;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.setValueAtTime(0.3, start + 0.13);
      gain.gain.linearRampToValueAtTime(0, start + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    }
  } catch {
    // ignorar errores de audio
  }
};

export const formatMs = (ms: number): string => {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export function useBrassGame(userId: string | undefined) {
  const [game, setGame] = useState<BrassGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0); // fuerza re-render del cronómetro
  const beepedTurnsRef = useRef(new Set<string>()); // turnos ya pitados en ESTE dispositivo
  const wakeLockRef = useRef<any>(null);

  // Suscripción realtime a la partida activa
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToActiveGame((activeGame) => {
      setGame(activeGame);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const isRunning = game?.status === 'active' && game.phase === 'playing';
  const turnKey = game ? `${game.era}-${game.round}-${game.currentPlayerIndex}` : '';

  // Tiempo transcurrido del turno actual: la verdad son los timestamps del doc,
  // nunca se acumulan ticks (sobrevive pantalla apagada y recargas)
  const elapsedMs = game
    ? game.turnAccumulatedMs + (game.turnStartedAt ? Date.now() - game.turnStartedAt : 0)
    : 0;
  const limitMs = (game?.turnLimitSec || 120) * 1000;
  const overtimeMs = Math.max(0, elapsedMs - limitMs);

  // Tick de re-render (500ms) solo mientras corre el cronómetro
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Pitido al cruzar el límite (cada dispositivo pita por su cuenta, una vez por turno)
  useEffect(() => {
    if (!isRunning) return;
    if (elapsedMs >= limitMs && !beepedTurnsRef.current.has(turnKey)) {
      beepedTurnsRef.current.add(turnKey);
      playBeep();
      navigator.vibrate?.([200, 100, 200]);
    }
  });

  // Wake Lock: mantener la pantalla encendida mientras corre el cronómetro
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (isRunning && 'wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // API no disponible o denegada; no pasa nada
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        setTick((t) => t + 1); // recalcular el cronómetro al volver
      }
    };

    if (isRunning) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release?.().catch?.(() => {});
      wakeLockRef.current = null;
    };
  }, [isRunning]);

  // --- Acciones (todas escriben a Firestore; todos los dispositivos las ven) ---

  const startGame = useCallback(
    async (
      players: { userId: string; name: string }[],
      turnLimitSec: number,
      roundsPerEra: number
    ) => {
      if (!userId) return;
      unlockAudio(); // gesto del usuario: desbloquea el audio de este dispositivo
      await createBrassGame(players, turnLimitSec, roundsPerEra, userId);
    },
    [userId]
  );

  const pause = useCallback(() => game && pauseBrassGame(game.id), [game]);
  const resume = useCallback(() => {
    unlockAudio();
    return game && resumeBrassGame(game.id);
  }, [game]);

  const nextPlayer = useCallback(() => {
    unlockAudio();
    return game && advanceBrassTurn(game.id, turnKey);
  }, [game, turnKey]);

  const undo = useCallback(() => game && undoBrassAdvance(game.id), [game]);

  const submitSpending = useCallback(
    (spending: Record<string, number>) =>
      game && submitBrassRoundSpending(game.id, `${game.era}-${game.round}`, spending),
    [game]
  );

  const continueToRail = useCallback(() => game && continueToRailEra(game.id), [game]);
  const endAtCanal = useCallback(() => game && endGameAtCanalEra(game.id), [game]);

  const submitScores = useCallback(
    (points: Record<string, number>) => game && finishBrassGame(game.id, points),
    [game]
  );

  const discard = useCallback(() => game && discardBrassGame(game.id), [game]);

  // El botón "Deshacer" se muestra un rato tras el último avance
  const canUndo =
    !!game?.undoSnapshot && !!game.undoAt && Date.now() - game.undoAt < 15000;

  return {
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
  };
}
