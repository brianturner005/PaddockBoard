export type ResultStatus = "finished" | "dnf" | "dns" | "dsq";

export interface ResultForStandings {
  driverId: string;
  classId: string;
  position: number | null;
  status: ResultStatus;
  bestLapMs: number | null;
  pointsOverride: number | null;
}

// One scoring session's worth of results for a round (event). May contain
// multiple classes mixed together -- computeStandings filters to the
// requested classId internally.
export interface RoundForStandings {
  eventId: string;
  roundNumber: number | null;
  results: ResultForStandings[];
}

export interface PointsScheme {
  positionPoints: Record<string, number>;
  poleBonus: number;
  fastestLapBonus: number;
  dropRounds: number;
}

export interface RoundPoints {
  eventId: string;
  roundNumber: number | null;
  points: number;
  dropped: boolean;
}

export interface DriverStanding {
  driverId: string;
  totalPoints: number;
  roundsCounted: number;
  roundsDropped: number;
  rounds: RoundPoints[];
  position: number;
}
