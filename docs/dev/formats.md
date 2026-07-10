# Orbits export format research

Research pass done before writing `packages/parsers`, per the project
brief's instruction to document findings rather than build against
assumptions. No real MyLaps Orbits export file was available at the time
of writing — everything below is either sourced from MYLAPS/partner
documentation (cited) or explicitly marked as an assumption/heuristic.

## What's documented

**Entry/participant list export** — documented directly by MYLAPS's help
center:
- Fields are separated by a comma (ASCII 44) **or a tab** (ASCII 9).
- Records end in CRLF (`\r\n`).
- Alphanumeric fields are quoted.
- Columns: No, Class, First Name, Last Name, Transponder 1, Transponder 2,
  Additional Data 1–4, Gender, Birthday.

Source: [MYLAPS software Orbits 4 and 5 help center](https://help.mylaps.com/s/orbits?language=en_US)

**Results export** — per the ORBITS5 manual, the results export includes
these columns: `Pos`, `Car` (number), `Combined Name`, `Laps`, `Total
Time`, `Last lap time`, `Best lap`, `Best lap-time`, `Last speed`, `Best
speed`, `Difference`.

Sources:
- [ORBITS5 Manual (scoring.racing mirror)](https://scoring.racing/wp-content/uploads/2022/12/ManualEng.pdf)
- [ORBITS5 Manual (MyRacePass mirror)](https://www.myracepass.com/downloads/get.aspx?i=433240)
- [MyRacePass — Importing Results from MyLaps Orbits](https://myracepass.zendesk.com/hc/en-us/articles/223723587-Importing-Results-from-MyLaps-Orbits-to-MyRacePass)

The export is triggered from Orbits' Processing tab: select the
group/run, then "Export results to file."

## What's not documented (assumptions and heuristics)

Stated plainly so a future contributor with a real file knows exactly what
to verify:

- **No actual raw sample export file was obtained** — only documented
  column names and delimiter rules. The synthetic fixtures in
  `fixtures/orbits/csv/` are built from the documented column names above,
  not invented from nothing, but they are still hand-authored test data,
  not real exports.
- **Encoding**: assumed to sometimes be Windows-1252 rather than UTF-8.
  This is a caution carried over from the project brief (typical of older
  Windows desktop timing software) — MYLAPS's own docs don't confirm an
  encoding one way or the other for the results export specifically. The
  parser detects invalid UTF-8 and falls back to Windows-1252 rather than
  assuming either.
- **Time field format**: assumed to be clock-style (`H:MM:SS.mmm` or
  `MM:SS.mmm`) based on how timing software conventionally formats
  durations. Not confirmed against a real file.
- **DNF/DNS/DSQ representation**: not documented anywhere found. The
  parser's heuristic looks for those tokens (case-insensitive) in the
  `Pos`/`Laps`/`Total Time` fields; anything else non-numeric where a
  number is expected becomes `status: "unknown"` plus a warning rather
  than a silent guess.
- **Delimiter auto-detection**: since MYLAPS docs confirm comma-or-tab (not
  a fixed delimiter), the parser uses Papa Parse's built-in delimiter
  detection rather than hardcoding one.

## HTML export (researched for Phase 2's orbits-html parser)

A second research pass, same honesty standard: **native "export to HTML"
isn't clearly documented anywhere found** for Orbits 4/5. What surfaced
instead:
- The Results Monitor / XML output feed is documented as an Advanced-tier
  feature — not HTML, and not something every club running Orbits has
  access to.
- The Standard tier has an "Announcer Page" feature, referenced in passing
  in community discussion but not documented in enough detail to pin down
  its exact markup.
- Anecdotally (forum discussion, not MYLAPS documentation), older/Standard
  installs are commonly used by printing or "Save As" on the on-screen
  results grid to produce an HTML file for posting — which would carry the
  same columns as the documented CSV export, just serialized as a
  `<table>` instead of comma-separated lines.

Sources: [MYLAPS software Orbits 4 and 5 help center](https://help.mylaps.com/s/orbits?language=en_US),
[TimingGuys.com — Live-timing with Mylaps Orbits 5 software](https://timingguys.com/topic/live-timing-with-mylaps-orbits-5-software)

**Working assumption, stated plainly**: `packages/parsers/src/orbits-html`
treats an Orbits HTML export as the same tabular data as the CSV export
(same column names, same alias table) wrapped in a `<table>` with a header
row. This is *not* confirmed against a real export — it's the most
defensible guess available given the "same underlying results grid,
different save format" pattern above, same spirit as the CSV parser's
already-stated assumptions. The parser only ever looks for the first
`<table>` in the file and takes its first row as headers; anything more
exotic (multiple tables, merged cells, nested markup) isn't handled.

## Replacing these assumptions

The moment a real Orbits export (CSV or HTML) is available: add it (or an
anonymized version) as a new fixture in `fixtures/orbits/csv/` (or a new
`fixtures/orbits/html/`), add a regression test pinned to it in the
matching parser's test file, and update the relevant provenance README. If
it reveals a wrong assumption above, fix this document too — that's the
whole point of writing it down.
