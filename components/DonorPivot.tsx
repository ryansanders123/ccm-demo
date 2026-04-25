"use client";

import { useMemo, useState } from "react";
import type { GiftRow } from "@/lib/donors";

type Dim = "year" | "fund" | "campaign" | "appeal" | "type";
type ColDim = Dim | "none";

const DIM_LABELS: Record<Dim, string> = {
  year: "Year",
  fund: "Fund",
  campaign: "Campaign",
  appeal: "Appeal",
  type: "Type",
};

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NONE = "—";

function dimValue(g: GiftRow, dim: Dim): string {
  switch (dim) {
    case "year":
      return g.date_received.slice(0, 4);
    case "fund":
      return g.fund_name ?? NONE;
    case "campaign":
      return g.campaign_name ?? NONE;
    case "appeal":
      return g.appeal_name ?? NONE;
    case "type":
      return g.type;
  }
}

function sortKeys(dim: Dim, keys: string[]): string[] {
  if (dim === "year") return [...keys].sort((a, b) => Number(b) - Number(a));
  if (dim === "type") {
    const order = ["cash", "check", "online"];
    return [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  return [...keys].sort((a, b) => {
    if (a === NONE) return 1;
    if (b === NONE) return -1;
    return a.localeCompare(b);
  });
}

export function DonorPivot({ gifts }: { gifts: GiftRow[] }) {
  const [rowDim, setRowDim] = useState<Dim>("year");
  const [colDim, setColDim] = useState<ColDim>("fund");

  const pivot = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cells: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    const rowCounts: Record<string, number> = {};
    let grand = 0;
    let grandCount = 0;
    for (const g of gifts) {
      const r = dimValue(g, rowDim);
      const c = colDim === "none" ? "Total" : dimValue(g, colDim);
      const amt = Number(g.amount);
      rowSet.add(r);
      colSet.add(c);
      cells[r] ??= {};
      cells[r][c] = (cells[r][c] ?? 0) + amt;
      rowTotals[r] = (rowTotals[r] ?? 0) + amt;
      colTotals[c] = (colTotals[c] ?? 0) + amt;
      rowCounts[r] = (rowCounts[r] ?? 0) + 1;
      grand += amt;
      grandCount += 1;
    }
    const rows = sortKeys(rowDim, Array.from(rowSet));
    const cols = colDim === "none"
      ? ["Total"]
      : sortKeys(colDim as Dim, Array.from(colSet));
    return { rows, cols, cells, rowTotals, colTotals, rowCounts, grand, grandCount };
  }, [gifts, rowDim, colDim]);

  if (gifts.length === 0) {
    return <div className="card p-8 text-center text-sm text-stone-500">No gifts recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 md:p-5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="row-dim" className="label">Rows</label>
          <select
            id="row-dim"
            value={rowDim}
            onChange={(e) => setRowDim(e.target.value as Dim)}
            className="input w-40"
          >
            {(Object.keys(DIM_LABELS) as Dim[]).map((d) => (
              <option key={d} value={d}>{DIM_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="col-dim" className="label">Columns</label>
          <select
            id="col-dim"
            value={colDim}
            onChange={(e) => setColDim(e.target.value as ColDim)}
            className="input w-40"
          >
            <option value="none">— none (totals only) —</option>
            {(Object.keys(DIM_LABELS) as Dim[])
              .filter((d) => d !== rowDim)
              .map((d) => (
                <option key={d} value={d}>{DIM_LABELS[d]}</option>
              ))}
          </select>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500">All-time</div>
          <div className="font-serif text-2xl tabular-nums text-brand-700">
            {fmtUsd(pivot.grand)}
          </div>
          <div className="text-xs text-stone-500">
            {pivot.grandCount} {pivot.grandCount === 1 ? "gift" : "gifts"}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 border-b border-stone-200">
              <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                <th className="sticky left-0 bg-stone-50/60 text-left px-4 py-3 font-medium whitespace-nowrap">
                  {DIM_LABELS[rowDim]}
                </th>
                {pivot.cols.map((c) => (
                  <th key={c} className="text-right px-4 py-3 font-medium whitespace-nowrap">
                    {c === NONE ? <span className="text-stone-400">none</span> : c}
                  </th>
                ))}
                {colDim !== "none" && (
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Total</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pivot.rows.map((r) => (
                <tr key={r} className="hover:bg-stone-50/60 transition-colors">
                  <td className="sticky left-0 bg-white px-4 py-3 font-medium text-stone-900 whitespace-nowrap">
                    {r === NONE ? <span className="text-stone-400">none</span> : r}
                  </td>
                  {pivot.cols.map((c) => {
                    const v = pivot.cells[r]?.[c];
                    return (
                      <td key={c} className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {v ? fmtUsd(v) : "—"}
                      </td>
                    );
                  })}
                  {colDim !== "none" && (
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-brand-700">
                      {fmtUsd(pivot.rowTotals[r] ?? 0)}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-stone-50/40 border-t border-stone-200">
                <td className="sticky left-0 bg-stone-50/40 px-4 py-3 font-medium text-stone-900">
                  Total
                </td>
                {pivot.cols.map((c) => (
                  <td key={c} className="px-4 py-3 text-right tabular-nums font-medium text-stone-900">
                    {fmtUsd(pivot.colTotals[c] ?? 0)}
                  </td>
                ))}
                {colDim !== "none" && (
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-brand-700">
                    {fmtUsd(pivot.grand)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
