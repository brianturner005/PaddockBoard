"use client";

import { CANONICAL_FIELDS, type CanonicalField } from "@paddockboard/parsers";
import { buttonClass, inputClass } from "./form-styles";

const FIELD_LABELS: Record<CanonicalField, string> = {
  position: "Finishing position",
  driverNumber: "Car / kart #",
  driverName: "Driver name",
  laps: "Laps completed",
  totalTimeMs: "Total time",
  bestLapMs: "Best lap time",
  gapMs: "Gap to leader",
  className: "Class",
};

export function GenericCsvColumnMapper({
  headers,
  mapping,
  onChange,
  onApply,
}: {
  headers: string[];
  mapping: Record<string, CanonicalField | "">;
  onChange: (header: string, field: CanonicalField | "") => void;
  onApply: () => void;
}) {
  const hasDriverName = Object.values(mapping).includes("driverName");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Match each column from your file to what it represents. This is remembered for next time you
        upload the same format.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="py-1 pr-2">Column in your file</th>
              <th className="py-1 pr-2">Maps to</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => (
              <tr key={header} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-1 pr-2 font-mono">{header}</td>
                <td className="py-1 pr-2">
                  <select
                    value={mapping[header] ?? ""}
                    onChange={(e) => onChange(header, e.target.value as CanonicalField | "")}
                    className={inputClass}
                  >
                    <option value="">Ignore this column</option>
                    {CANONICAL_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hasDriverName && (
        <p className="text-sm text-red-600">Map at least one column to &ldquo;Driver name&rdquo; to continue.</p>
      )}
      <button type="button" onClick={onApply} disabled={!hasDriverName} className={`self-start ${buttonClass}`}>
        Continue
      </button>
    </div>
  );
}
