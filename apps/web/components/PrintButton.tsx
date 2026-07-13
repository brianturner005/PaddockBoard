"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="text-sm underline">
      Print
    </button>
  );
}
