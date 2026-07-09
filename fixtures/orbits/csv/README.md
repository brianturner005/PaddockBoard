# Orbits CSV fixtures

All fixtures below are **synthetic** — no real MyLaps Orbits export file was
obtained. Column names are built from documented sources (see
[`docs/dev/formats.md`](../../../docs/dev/formats.md)), not invented, but
the files themselves are hand-authored test data. **Replace with real
exports as soon as a club shares one**, and add a regression test/fixture
pair for anything a real file reveals that these don't cover.

| File | Synthetic | Delimiter | Encoding | Exercises |
|---|---|---|---|---|
| `v1-synthetic-final.csv` | Yes | comma | UTF-8 | Baseline happy path: 8 finishers, an unrecognized `Notes` column, a known-but-unmodeled `Last Lap Time` column |
| `v1-synthetic-heat.csv` | Yes | comma | UTF-8 | DNF and DSQ rows via the `Pos` column status heuristic |
| `v1-synthetic-tab-delimited.csv` | Yes | tab | UTF-8 | Papa Parse's delimiter auto-detection against the documented tab-delimited variant |
| `v1-synthetic-windows1252.csv` | Yes | comma | Windows-1252 | Encoding fallback (accented driver names: André Béchard, Renée Dupré) |

Each file has a paired test in
`packages/parsers/src/orbits-csv/parse.test.ts`.
