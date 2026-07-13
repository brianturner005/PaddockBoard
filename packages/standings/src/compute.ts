import type { DriverStanding, PointsScheme, RoundForStandings, RoundPoints } from "./types";

interface DriverRoundRecord {
  driverId: string;
  eventId: string;
  roundNumber: number | null;
  points: number;
  position: number | null;
}

/**
 * Pure function: results + a points scheme in, ranked standings out. No I/O,
 * no DB access -- rounds are pre-fetched by the caller (only the sessions
 * flagged countsForStandings, one per event).
 *
 * Pole bonus is deliberately not computed here yet -- there's no data source
 * for "who took pole" wired up (that would come from a qualifying session,
 * not the scoring session). scheme.poleBonus is accepted for forward
 * compatibility but currently unused; admins can apply it by hand via
 * results.points_override until pole-tracking exists.
 */
export function computeStandings(
  rounds: RoundForStandings[],
  scheme: PointsScheme,
  classId: string
): DriverStanding[] {
  const records: DriverRoundRecord[] = [];

  for (const round of rounds) {
    const classResults = round.results.filter((r) => r.classId === classId);

    // Fastest lap bonus goes to the quickest recorded lap among finishers.
    let fastestLapDriverId: string | null = null;
    let fastestLapMs = Infinity;
    for (const r of classResults) {
      if (r.status === "finished" && r.bestLapMs !== null && r.bestLapMs < fastestLapMs) {
        fastestLapMs = r.bestLapMs;
        fastestLapDriverId = r.driverId;
      }
    }

    for (const r of classResults) {
      let points: number;
      if (r.pointsOverride !== null) {
        points = r.pointsOverride;
      } else {
        // No position (DNF/DNS/DSQ) scores 0 by default -- a steward can
        // still award points via pointsOverride for a specific decision.
        points = r.position !== null ? (scheme.positionPoints[String(r.position)] ?? 0) : 0;
        if (r.driverId === fastestLapDriverId) {
          points += scheme.fastestLapBonus;
        }
      }

      // Penalties apply on top of either the position-based score or a
      // manual override -- a steward's penalty decision is independent of
      // how the base points were arrived at.
      points += r.penaltyPoints;

      records.push({
        driverId: r.driverId,
        eventId: round.eventId,
        roundNumber: round.roundNumber,
        points,
        position: r.position,
      });
    }
  }

  const byDriver = new Map<string, DriverRoundRecord[]>();
  for (const rec of records) {
    const list = byDriver.get(rec.driverId) ?? [];
    list.push(rec);
    byDriver.set(rec.driverId, list);
  }

  const withCountback: (DriverStanding & { countback: number[] })[] = [];

  for (const [driverId, driverRounds] of byDriver) {
    // Drop the driver's N lowest-scoring rounds (never more than they have).
    const sortedByPointsAsc = [...driverRounds].sort((a, b) => a.points - b.points);
    const dropCount = Math.min(scheme.dropRounds, driverRounds.length);
    const droppedSet = new Set(sortedByPointsAsc.slice(0, dropCount));

    const roundsOut: RoundPoints[] = driverRounds.map((r) => ({
      eventId: r.eventId,
      roundNumber: r.roundNumber,
      points: r.points,
      dropped: droppedSet.has(r),
    }));

    const counted = roundsOut.filter((r) => !r.dropped);
    const totalPoints = counted.reduce((sum, r) => sum + r.points, 0);

    // Countback: count of P1s, then P2s, then P3s, ... among counted rounds.
    const countedPositions = driverRounds
      .filter((r) => !droppedSet.has(r))
      .map((r) => r.position)
      .filter((p): p is number => p !== null);
    const maxPosition = Math.max(1, ...countedPositions);
    const countback: number[] = Array.from(
      { length: maxPosition },
      (_, i) => countedPositions.filter((p) => p === i + 1).length
    );

    withCountback.push({
      driverId,
      totalPoints,
      roundsCounted: counted.length,
      roundsDropped: roundsOut.length - counted.length,
      rounds: roundsOut,
      position: 0,
      countback,
    });
  }

  withCountback.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const len = Math.max(a.countback.length, b.countback.length);
    for (let i = 0; i < len; i++) {
      const diff = (b.countback[i] ?? 0) - (a.countback[i] ?? 0);
      if (diff !== 0) return diff;
    }
    // Final deterministic tiebreak -- true ties are rare and Phase 1
    // doesn't render shared positions ("T-3") yet.
    return a.driverId < b.driverId ? -1 : a.driverId > b.driverId ? 1 : 0;
  });

  withCountback.forEach((s, i) => {
    s.position = i + 1;
  });

  return withCountback.map((s) => ({
    driverId: s.driverId,
    totalPoints: s.totalPoints,
    roundsCounted: s.roundsCounted,
    roundsDropped: s.roundsDropped,
    rounds: s.rounds,
    position: s.position,
  }));
}
