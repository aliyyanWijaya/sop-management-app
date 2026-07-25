// app/sop/[id]/print/PrintButton.tsx
"use client";
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print-btn mb-4 rounded bg-black px-4 py-2 text-sm text-white"
    >
      Print / Export PDF
    </button>
  );
}
