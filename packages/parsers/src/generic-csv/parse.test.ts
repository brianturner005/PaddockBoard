import { describe, it, expect } from "vitest";
import { parseGenericCsv, readCsvHeaders } from "./parse";
import type { CanonicalField } from "../types";

function toBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

// Deliberately arbitrary column names — a generic CSV, by definition, has no
// fixed format to model fixtures against, unlike orbits-csv's documented
// columns (see fixtures/orbits/csv/README.md).
const CSV =
  "Finish,Kart,Racer,Circuits,Race Time,Fast Circuit,Behind,Notes\n" +
  "1,7,Sam Ortiz,15,12:03.500,0:48.100,,\n" +
  "2,3,Jess Kwan,15,12:05.900,0:48.900,2.400,\n" +
  "3,9,Casey Lin,11,DNF,,,retired lap 11\n";

describe("readCsvHeaders", () => {
  it("returns just the header row without parsing the rest of the file", () => {
    const { headers } = readCsvHeaders(toBuffer(CSV));
    expect(headers).toEqual([
      "Finish",
      "Kart",
      "Racer",
      "Circuits",
      "Race Time",
      "Fast Circuit",
      "Behind",
      "Notes",
    ]);
  });

  it("throws on an empty file", () => {
    expect(() => readCsvHeaders(new ArrayBuffer(0))).toThrow();
  });
});

describe("parseGenericCsv", () => {
  const mapping: Record<string, CanonicalField> = {
    Finish: "position",
    Kart: "driverNumber",
    Racer: "driverName",
    Circuits: "laps",
    "Race Time": "totalTimeMs",
    "Fast Circuit": "bestLapMs",
    Behind: "gapMs",
  };

  it("parses rows using an explicit, admin-picked column mapping", () => {
    const result = parseGenericCsv(toBuffer(CSV), mapping);

    expect(result.rows).toHaveLength(3);
    expect(result.unrecognizedColumns).toEqual(["Notes"]);

    const first = result.rows[0];
    expect(first.position).toBe(1);
    expect(first.driverName).toBe("Sam Ortiz");
    expect(first.driverNumber).toBe("7");
    expect(first.laps).toBe(15);
    expect(first.status).toBe("finished");

    const dnf = result.rows[2];
    expect(dnf.status).toBe("dnf");
    expect(dnf.driverName).toBe("Casey Lin");
    expect(dnf.position).toBeNull();
  });

  it("treats headers absent from the mapping as unrecognized, not errors", () => {
    const partialMapping: Record<string, CanonicalField> = { Racer: "driverName" };
    const result = parseGenericCsv(toBuffer(CSV), partialMapping);

    expect(result.rows).toHaveLength(3);
    expect(result.unrecognizedColumns).toContain("Finish");
    expect(result.rows[0].driverName).toBe("Sam Ortiz");
    expect(result.rows[0].position).toBeNull();
  });

  it("throws only on truly unparseable input (empty file)", () => {
    expect(() => parseGenericCsv(new ArrayBuffer(0), mapping)).toThrow();
  });
});
