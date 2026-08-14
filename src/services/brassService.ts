import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BrassGame, BrassPlayer, BrassRoundRecord } from '../types';

const BRASS_GAMES_COLLECTION = 'brassGames';

// Rondas estándar por era según número de jugadores (regla de Brass Birmingham)
export const STANDARD_ROUNDS_PER_ERA: Record<number, number> = { 2: 10, 3: 9, 4: 8 };

const mapGame = (id: string, data: Record<string, any>): BrassGame => ({
  id,
  status: data.status,
  phase: data.phase,
  players: data.players || [],
  turnLimitSec: data.turnLimitSec || 120,
  roundsPerEra: data.roundsPerEra || 8,
  era: data.era || 'canal',
  round: data.round || 1,
  currentPlayerIndex: data.currentPlayerIndex || 0,
  turnStartedAt: data.turnStartedAt ?? null,
  turnAccumulatedMs: data.turnAccumulatedMs || 0,
  gameStartedAt: data.gameStartedAt || 0,
  rounds: data.rounds || [],
  undoSnapshot: data.undoSnapshot ?? null,
  undoAt: data.undoAt ?? null,
  playerCount: data.playerCount || (data.players?.length ?? 0),
  createdBy: data.createdBy,
  updatedAt: data.updatedAt?.toDate() || new Date(),
  finishedAt: data.finishedAt?.toDate(),
  durationMs: data.durationMs,
  playedRailEra: data.playedRailEra,
  winnerIds: data.winnerIds
});

/**
 * Suscribirse a la partida activa (a lo sumo debe existir una).
 */
export const subscribeToActiveGame = (callback: (game: BrassGame | null) => void) => {
  const q = query(collection(db, BRASS_GAMES_COLLECTION), where('status', '==', 'active'));

  return onSnapshot(q, (snapshot) => {
    const games: BrassGame[] = [];
    snapshot.forEach((docSnap) => games.push(mapGame(docSnap.id, docSnap.data())));
    // Si por carrera existieran varias, tomar la más reciente
    games.sort((a, b) => b.gameStartedAt - a.gameStartedAt);
    callback(games[0] || null);
  });
};

/**
 * Suscribirse a las partidas terminadas (histórico), más recientes primero.
 */
export const subscribeToFinishedGames = (callback: (games: BrassGame[]) => void) => {
  const q = query(collection(db, BRASS_GAMES_COLLECTION), where('status', '==', 'finished'));

  return onSnapshot(q, (snapshot) => {
    const games: BrassGame[] = [];
    snapshot.forEach((docSnap) => games.push(mapGame(docSnap.id, docSnap.data())));
    games.sort((a, b) => (b.finishedAt?.getTime() || 0) - (a.finishedAt?.getTime() || 0));
    callback(games);
  });
};

/**
 * Crea una nueva partida activa.
 */
export const createBrassGame = async (
  players: { userId: string; name: string }[],
  turnLimitSec: number,
  roundsPerEra: number,
  createdBy: string
): Promise<void> => {
  try {
    const now = Date.now();
    const brassPlayers: BrassPlayer[] = players.map((p) => ({
      userId: p.userId,
      name: p.name,
      totalTimeMs: 0,
      turnCount: 0,
      overtimeCount: 0,
      overtimeTotalMs: 0
    }));

    await addDoc(collection(db, BRASS_GAMES_COLLECTION), {
      status: 'active',
      phase: 'playing',
      players: brassPlayers,
      turnLimitSec,
      roundsPerEra,
      era: 'canal',
      round: 1,
      currentPlayerIndex: 0,
      turnStartedAt: now,
      turnAccumulatedMs: 0,
      gameStartedAt: now,
      rounds: [],
      undoSnapshot: null,
      undoAt: null,
      playerCount: players.length,
      createdBy,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Partida de Brass creada');
  } catch (error) {
    console.error('Error al crear partida:', error);
    throw error;
  }
};

/**
 * Pausa el cronómetro (visible para todos los jugadores).
 */
export const pauseBrassGame = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'playing') return;
      const accumulated =
        (data.turnAccumulatedMs || 0) + (data.turnStartedAt ? Date.now() - data.turnStartedAt : 0);
      tx.update(gameRef, {
        phase: 'paused',
        turnAccumulatedMs: accumulated,
        turnStartedAt: null,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al pausar partida:', error);
    throw error;
  }
};

/**
 * Reanuda el cronómetro.
 */
export const resumeBrassGame = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'paused') return;
      tx.update(gameRef, {
        phase: 'playing',
        turnStartedAt: Date.now(),
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al reanudar partida:', error);
    throw error;
  }
};

/**
 * Cierra el turno actual y pasa al siguiente jugador (o a fin de ronda).
 * Transacción con guard: si dos jugadores tocan "Siguiente" a la vez, solo avanza una vez.
 * expectedTurnKey = `${era}-${round}-${currentPlayerIndex}` que el cliente veía.
 */
export const advanceBrassTurn = async (gameId: string, expectedTurnKey: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active') return;
      if (data.phase !== 'playing' && data.phase !== 'paused') return;
      const turnKey = `${data.era}-${data.round}-${data.currentPlayerIndex}`;
      if (turnKey !== expectedTurnKey) return; // otro dispositivo ya avanzó

      const now = Date.now();
      const elapsed =
        (data.turnAccumulatedMs || 0) + (data.turnStartedAt ? now - data.turnStartedAt : 0);
      const limitMs = (data.turnLimitSec || 120) * 1000;
      const overtime = Math.max(0, elapsed - limitMs);

      // Snapshot para deshacer (estado previo al avance)
      const undoSnapshot = JSON.stringify({
        phase: data.phase,
        players: data.players,
        currentPlayerIndex: data.currentPlayerIndex,
        turnStartedAt: data.turnStartedAt,
        turnAccumulatedMs: data.turnAccumulatedMs
      });

      const players = (data.players as BrassPlayer[]).map((p, i) =>
        i === data.currentPlayerIndex
          ? {
              ...p,
              totalTimeMs: p.totalTimeMs + elapsed,
              turnCount: p.turnCount + 1,
              overtimeCount: p.overtimeCount + (overtime > 0 ? 1 : 0),
              overtimeTotalMs: p.overtimeTotalMs + overtime
            }
          : p
      );

      const isLastPlayer = data.currentPlayerIndex >= players.length - 1;
      tx.update(gameRef, {
        players,
        phase: isLastPlayer ? 'roundEnd' : 'playing',
        currentPlayerIndex: isLastPlayer ? data.currentPlayerIndex : data.currentPlayerIndex + 1,
        turnStartedAt: isLastPlayer ? null : now,
        turnAccumulatedMs: 0,
        undoSnapshot,
        undoAt: now,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al avanzar turno:', error);
    throw error;
  }
};

/**
 * Deshace el último "Siguiente jugador" (toque accidental).
 */
export const undoBrassAdvance = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || !data.undoSnapshot) return;
      // Solo se puede deshacer si no ha pasado nada más desde el avance
      if (data.phase !== 'playing' && data.phase !== 'paused' && data.phase !== 'roundEnd') return;
      const prev = JSON.parse(data.undoSnapshot);
      tx.update(gameRef, {
        phase: prev.phase,
        players: prev.players,
        currentPlayerIndex: prev.currentPlayerIndex,
        turnStartedAt: prev.turnStartedAt,
        turnAccumulatedMs: prev.turnAccumulatedMs,
        undoSnapshot: null,
        undoAt: null,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al deshacer turno:', error);
    throw error;
  }
};

/**
 * Reordena los jugadores según el gasto de la ronda (menor gasto va primero;
 * empates conservan el orden previo — regla oficial de Brass) y avanza de ronda/era.
 */
export const submitBrassRoundSpending = async (
  gameId: string,
  expectedRoundKey: string, // `${era}-${round}`
  spending: Record<string, number>
): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'roundEnd') return;
      if (`${data.era}-${data.round}` !== expectedRoundKey) return;

      const players = data.players as BrassPlayer[];
      const reordered = players
        .map((p, i) => ({ p, i }))
        .sort(
          (a, b) =>
            (spending[a.p.userId] || 0) - (spending[b.p.userId] || 0) || a.i - b.i
        )
        .map((x) => x.p);

      const roundRecord: BrassRoundRecord = {
        era: data.era,
        round: data.round,
        spending
      };

      const isLastRound = data.round >= data.roundsPerEra;
      const update: Record<string, any> = {
        players: reordered,
        rounds: [...(data.rounds || []), roundRecord],
        currentPlayerIndex: 0,
        turnAccumulatedMs: 0,
        undoSnapshot: null,
        undoAt: null,
        updatedAt: serverTimestamp()
      };

      if (!isLastRound) {
        update.phase = 'playing';
        update.round = data.round + 1;
        update.turnStartedAt = Date.now();
      } else if (data.era === 'canal') {
        update.phase = 'eraEnd';
        update.turnStartedAt = null;
      } else {
        update.phase = 'scoring';
        update.turnStartedAt = null;
      }

      tx.update(gameRef, update);
    });
  } catch (error) {
    console.error('Error al registrar gastos de la ronda:', error);
    throw error;
  }
};

/**
 * Tras la Era de Canales: continuar con la Era de Ferrocarril.
 */
export const continueToRailEra = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'eraEnd') return;
      tx.update(gameRef, {
        phase: 'playing',
        era: 'rail',
        round: 1,
        currentPlayerIndex: 0,
        turnStartedAt: Date.now(),
        turnAccumulatedMs: 0,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al iniciar Era de Ferrocarril:', error);
    throw error;
  }
};

/**
 * Tras la Era de Canales: terminar el juego aquí e ir al registro de puntos.
 */
export const endGameAtCanalEra = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'eraEnd') return;
      tx.update(gameRef, {
        phase: 'scoring',
        turnStartedAt: null,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error al terminar en Era de Canales:', error);
    throw error;
  }
};

/**
 * Guarda los PV finales, calcula posiciones y ganador(es), y cierra la partida.
 */
export const finishBrassGame = async (
  gameId: string,
  points: Record<string, number>
): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'active' || data.phase !== 'scoring') return;

      const players = (data.players as BrassPlayer[]).map((p) => {
        const pts = points[p.userId] || 0;
        // Posición = 1 + cuántos jugadores tienen estrictamente más puntos (empates comparten posición)
        const position =
          1 +
          (data.players as BrassPlayer[]).filter(
            (other) => (points[other.userId] || 0) > pts
          ).length;
        return {
          ...p,
          points: pts,
          position,
          avgTurnMs: p.turnCount > 0 ? Math.round(p.totalTimeMs / p.turnCount) : 0
        };
      });

      const winnerIds = players.filter((p) => p.position === 1).map((p) => p.userId);

      tx.update(gameRef, {
        status: 'finished',
        players,
        winnerIds,
        playedRailEra: data.era === 'rail',
        durationMs: Date.now() - (data.gameStartedAt || Date.now()),
        finishedAt: serverTimestamp(),
        turnStartedAt: null,
        undoSnapshot: null,
        undoAt: null,
        updatedAt: serverTimestamp()
      });
    });
    console.log('✅ Partida de Brass guardada');
  } catch (error) {
    console.error('Error al guardar partida:', error);
    throw error;
  }
};

/**
 * Descarta la partida activa (se cierra para todos, no cuenta en el histórico).
 */
export const discardBrassGame = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(db, BRASS_GAMES_COLLECTION, gameId);
    await updateDoc(gameRef, {
      status: 'discarded',
      turnStartedAt: null,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Partida descartada');
  } catch (error) {
    console.error('Error al descartar partida:', error);
    throw error;
  }
};
