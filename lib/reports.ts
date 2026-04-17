export type RowForSummary = {
  id: string;
  type: "cash" | "check" | "online";
  amount: string;
  fund_name: string;
  voided_at: string | null;
};

export type Summary = {
  byType: Record<"cash" | "check" | "online", number>;
  byFund: Record<string, number>;
  grand: number;
};

export function summarize(rows: RowForSummary[]): Summary {
  const byType: Record<"cash" | "check" | "online", number> = { cash: 0, check: 0, online: 0 };
  const byFund: Record<string, number> = {};
  let grand = 0;
  for (const r of rows) {
    if (r.voided_at) continue;
    const n = Number(r.amount);
    byType[r.type] += n;
    byFund[r.fund_name] = (byFund[r.fund_name] ?? 0) + n;
    grand += n;
  }
  return { byType, byFund, grand };
}

export function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const end = `${next.y}-${String(next.m).padStart(2, "0")}-01`;
  return { start, end };
}
