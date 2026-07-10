import { describe, it, expect } from "vitest";
import { parseOrbitsHtml } from "./parse";

function toBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function ms(hours: number, minutes: number, seconds: number): number {
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

// Synthetic -- no real Orbits HTML export sample was found (see
// docs/dev/formats.md). Uses the same documented column names as the CSV
// fixtures, wrapped in a <table>.
const HTML = `<html><body>
<table>
<tr><th>Pos</th><th>Car</th><th>Combined Name</th><th>Laps</th><th>Total Time</th><th>Best Lap</th><th>Difference</th></tr>
<tr><td>1</td><td>12</td><td>Alex Rivera</td><td>20</td><td>18:32.104</td><td>0:54.201</td><td></td></tr>
<tr><td>2</td><td>7</td><td>Jamie &amp; Cole</td><td>20</td><td>18:34.558</td><td>0:55.010</td><td>2.454</td></tr>
<tr><td>DNF</td><td>9</td><td>Taylor Brooks</td><td>9</td><td></td><td></td><td></td></tr>
</table>
</body></html>`;

describe("parseOrbitsHtml", () => {
  it("parses a results table with all finishers", () => {
    const result = parseOrbitsHtml(toBuffer(HTML));

    expect(result.rows).toHaveLength(3);
    expect(result.unrecognizedColumns).toEqual([]);

    const first = result.rows[0];
    expect(first.position).toBe(1);
    expect(first.driverName).toBe("Alex Rivera");
    expect(first.driverNumber).toBe("12");
    expect(first.laps).toBe(20);
    expect(first.totalTimeMs).toBe(ms(0, 18, 32.104));
    expect(first.bestLapMs).toBe(ms(0, 0, 54.201));
    expect(first.status).toBe("finished");

    const second = result.rows[1];
    expect(second.driverName).toBe("Jamie & Cole");
    expect(second.gapMs).toBe(ms(0, 0, 2.454));
  });

  it("flags DNF rows via the position-column status heuristic", () => {
    const result = parseOrbitsHtml(toBuffer(HTML));

    const dnf = result.rows[2];
    expect(dnf.status).toBe("dnf");
    expect(dnf.driverName).toBe("Taylor Brooks");
    expect(dnf.position).toBeNull();
  });

  it("throws when there's no table in the file", () => {
    expect(() => parseOrbitsHtml(toBuffer("<html><body>no results here</body></html>"))).toThrow();
  });

  it("throws only on truly unparseable input (empty file)", () => {
    expect(() => parseOrbitsHtml(new ArrayBuffer(0))).toThrow();
  });
});
