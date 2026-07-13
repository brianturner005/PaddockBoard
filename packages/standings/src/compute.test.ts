import { describe, it, expect } from "vitest";
import { computeStandings } from "./compute";
import type { PointsScheme, RoundForStandings, ResultForStandings } from "./types";

const SCHEME: PointsScheme = {
  positionPoints: { "1": 25, "2": 20, "3": 16, "4": 13, "5": 11 },
  poleBonus: 1,
  fastestLapBonus: 1,
  dropRounds: 0,
};

const CLASS_A = "class-a";
const CLASS_B = "class-b";

function result(overrides: Partial<ResultForStandings> & { driverId: string }): ResultForStandings {
  return {
    classId: CLASS_A,
    position: null,
    status: "finished",
    bestLapMs: null,
    pointsOverride: null,
    penaltyPoints: 0,
    ...overrides,
  };
}

function round(eventId: string, roundNumber: number, results: ResultForStandings[]): RoundForStandings {
  return { eventId, roundNumber, results };
}

describe("computeStandings", () => {
  it("scores basic positions across rounds and ranks by total points", () => {
    const rounds = [
      round("e1", 1, [
        result({ driverId: "alex", position: 1 }),
        result({ driverId: "sam", position: 2 }),
      ]),
      round("e2", 2, [
        result({ driverId: "alex", position: 2 }),
        result({ driverId: "sam", position: 1 }),
      ]),
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    // alex: 25 + 20 = 45, sam: 20 + 25 = 45 -- tied on points, tied on
    // countback (one win each) too, so falls through to the driverId tiebreak.
    expect(standings).toHaveLength(2);
    expect(standings[0].totalPoints).toBe(45);
    expect(standings[1].totalPoints).toBe(45);
    expect(standings.map((s) => s.driverId)).toEqual(["alex", "sam"]); // "alex" < "sam"
  });

  it("drops the N lowest-scoring rounds per driver", () => {
    const rounds = [
      round("e1", 1, [result({ driverId: "alex", position: 1 })]), // 25
      round("e2", 2, [result({ driverId: "alex", position: 5 })]), // 11 -- worst, gets dropped
      round("e3", 3, [result({ driverId: "alex", position: 2 })]), // 20
    ];

    const scheme: PointsScheme = { ...SCHEME, dropRounds: 1 };
    const [standing] = computeStandings(rounds, scheme, CLASS_A);

    expect(standing.totalPoints).toBe(45); // 25 + 20, the 11 is dropped
    expect(standing.roundsCounted).toBe(2);
    expect(standing.roundsDropped).toBe(1);
    expect(standing.rounds.find((r) => r.eventId === "e2")?.dropped).toBe(true);
  });

  it("never drops more rounds than a driver actually has", () => {
    const rounds = [round("e1", 1, [result({ driverId: "alex", position: 1 })])];
    const scheme: PointsScheme = { ...SCHEME, dropRounds: 5 };

    const [standing] = computeStandings(rounds, scheme, CLASS_A);

    expect(standing.roundsDropped).toBe(1);
    expect(standing.roundsCounted).toBe(0);
    expect(standing.totalPoints).toBe(0);
  });

  it("breaks ties on total points via countback (most wins, then most 2nds, ...)", () => {
    const rounds = [
      // alex: 25 + 13 + 11 = 49 (one win)
      round("e1", 1, [result({ driverId: "alex", position: 1 }), result({ driverId: "sam", position: 3 })]),
      round("e2", 2, [result({ driverId: "alex", position: 4 }), result({ driverId: "sam", position: 2 })]),
      // sam: 16 + 20 + 13 = 49 (zero wins) -- same total as alex, fewer wins
      round("e3", 3, [result({ driverId: "alex", position: 5 }), result({ driverId: "sam", position: 4 })]),
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    expect(standings[0].totalPoints).toBe(49);
    expect(standings[1].totalPoints).toBe(49);
    // alex has one win (P1) and sam has zero wins -- alex ranks first on
    // countback despite the equal point total.
    expect(standings[0].driverId).toBe("alex");
    expect(standings[1].driverId).toBe("sam");
  });

  it("awards the fastest-lap bonus to the quickest recorded lap among finishers", () => {
    const rounds = [
      round("e1", 1, [
        result({ driverId: "alex", position: 1, bestLapMs: 50000 }),
        result({ driverId: "sam", position: 2, bestLapMs: 49000 }), // fastest lap
      ]),
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    const alex = standings.find((s) => s.driverId === "alex")!;
    const sam = standings.find((s) => s.driverId === "sam")!;
    expect(alex.totalPoints).toBe(25); // no bonus
    expect(sam.totalPoints).toBe(21); // 20 + 1 fastest-lap bonus
  });

  it("only considers the requested class's rows in a mixed-class session", () => {
    const rounds = [
      round("e1", 1, [
        result({ driverId: "alex", classId: CLASS_A, position: 1 }),
        result({ driverId: "jordan", classId: CLASS_B, position: 1 }),
      ]),
    ];

    const classAStandings = computeStandings(rounds, SCHEME, CLASS_A);
    const classBStandings = computeStandings(rounds, SCHEME, CLASS_B);

    expect(classAStandings.map((s) => s.driverId)).toEqual(["alex"]);
    expect(classBStandings.map((s) => s.driverId)).toEqual(["jordan"]);
  });

  it("scores DNF/DNS/DSQ as 0 points by default, unless pointsOverride is set", () => {
    const rounds = [
      round("e1", 1, [
        result({ driverId: "alex", position: null, status: "dnf" }),
        result({ driverId: "sam", position: null, status: "dsq", pointsOverride: -5 }),
        result({ driverId: "jordan", position: 1 }),
      ]),
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    expect(standings.find((s) => s.driverId === "alex")!.totalPoints).toBe(0);
    expect(standings.find((s) => s.driverId === "sam")!.totalPoints).toBe(-5);
    expect(standings.find((s) => s.driverId === "jordan")!.totalPoints).toBe(25);
  });

  it("applies penalty points on top of position-based or overridden points", () => {
    const rounds = [
      round("e1", 1, [
        result({ driverId: "alex", position: 1, penaltyPoints: -5 }), // 25 - 5
        result({ driverId: "sam", position: 3, pointsOverride: 10, penaltyPoints: -2 }), // 10 - 2
      ]),
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    expect(standings.find((s) => s.driverId === "alex")!.totalPoints).toBe(20);
    expect(standings.find((s) => s.driverId === "sam")!.totalPoints).toBe(8);
  });

  it("only counts rounds a driver actually appears in", () => {
    const rounds = [
      round("e1", 1, [result({ driverId: "alex", position: 1 }), result({ driverId: "sam", position: 2 })]),
      round("e2", 2, [result({ driverId: "alex", position: 1 })]), // sam sat this one out
    ];

    const standings = computeStandings(rounds, SCHEME, CLASS_A);

    expect(standings.find((s) => s.driverId === "sam")!.roundsCounted).toBe(1);
    expect(standings.find((s) => s.driverId === "alex")!.roundsCounted).toBe(2);
  });
});
