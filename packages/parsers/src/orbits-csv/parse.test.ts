import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseOrbitsCsv } from "./parse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../../../../fixtures/orbits/csv");

function readFixture(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(fixturesDir, name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function ms(hours: number, minutes: number, seconds: number): number {
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

describe("parseOrbitsCsv", () => {
  it("parses a comma-delimited final with all finishers", () => {
    const result = parseOrbitsCsv(readFixture("v1-synthetic-final.csv"));

    expect(result.encoding).toBe("utf-8");
    expect(result.rows).toHaveLength(8);
    expect(result.unrecognizedColumns).toEqual(["Notes"]);

    const first = result.rows[0];
    expect(first.position).toBe(1);
    expect(first.driverName).toBe("Alex Rivera");
    expect(first.driverNumber).toBe("12");
    expect(first.laps).toBe(20);
    expect(first.totalTimeMs).toBe(ms(0, 18, 32.104));
    expect(first.bestLapMs).toBe(ms(0, 0, 54.201));
    expect(first.gapMs).toBeUndefined();
    expect(first.status).toBe("finished");

    const second = result.rows[1];
    expect(second.gapMs).toBe(ms(0, 0, 2.454));

    // A lap-down finisher — "+1 lap" lives in the unrecognized Notes
    // column and shouldn't affect position/laps parsing.
    const lapDown = result.rows[6];
    expect(lapDown.position).toBe(7);
    expect(lapDown.laps).toBe(19);
    expect(lapDown.status).toBe("finished");

    expect(result.warnings).toHaveLength(0);
  });

  it("flags DNF and DSQ rows via the position-column status heuristic", () => {
    const result = parseOrbitsCsv(readFixture("v1-synthetic-heat.csv"));

    expect(result.rows).toHaveLength(5);

    const dnf = result.rows[3];
    expect(dnf.status).toBe("dnf");
    expect(dnf.driverName).toBe("Taylor Brooks");
    expect(dnf.position).toBeNull();
    // Non-finished rows don't get lap/time parsed even if present in the
    // raw data — it's preserved in rawRow for manual review instead.
    expect(dnf.laps).toBeUndefined();
    expect(dnf.rawRow.Laps).toBe("9");

    const dsq = result.rows[4];
    expect(dsq.status).toBe("dsq");
    expect(dsq.driverName).toBe("Morgan Diaz");

    const finisher = result.rows[0];
    expect(finisher.status).toBe("finished");
    expect(finisher.position).toBe(1);
  });

  it("auto-detects a tab-delimited file", () => {
    const result = parseOrbitsCsv(readFixture("v1-synthetic-tab-delimited.csv"));

    expect(result.rows).toHaveLength(4);
    expect(result.unrecognizedColumns).toEqual([]);

    const first = result.rows[0];
    expect(first.driverName).toBe("Avery Stone");
    expect(first.driverNumber).toBe("3");
    expect(first.laps).toBe(12);
    expect(first.totalTimeMs).toBe(ms(0, 9, 12.004));
  });

  it("falls back to windows-1252 for non-UTF-8 files and decodes accents correctly", () => {
    const result = parseOrbitsCsv(readFixture("v1-synthetic-windows1252.csv"));

    expect(result.encoding).toBe("windows-1252");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].driverName).toBe("André Béchard");
    expect(result.rows[1].driverName).toBe("Renée Dupré");
  });

  it("never throws on recoverable issues — unparseable fields become warnings", () => {
    const csv = "Pos,Car,Combined Name,Laps,Total Time,Best Lap,Difference\n1,1,Riley Fox,abc,not-a-time,also-bad,??\n";
    const buffer = new TextEncoder().encode(csv).buffer;

    const result = parseOrbitsCsv(buffer);

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.laps).toBeUndefined();
    expect(row.totalTimeMs).toBeUndefined();
    expect(row.bestLapMs).toBeUndefined();
    expect(row.gapMs).toBeUndefined();
    expect(row.status).toBe("finished"); // position parsed fine
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(row.rawRow["Total Time"]).toBe("not-a-time");
  });

  it("throws only on truly unparseable input (empty file)", () => {
    expect(() => parseOrbitsCsv(new ArrayBuffer(0))).toThrow();
  });
});
