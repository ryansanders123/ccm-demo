"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { GiftRow } from "@/lib/donors";

type Dim = "fund" | "campaign" | "appeal" | "type";

const DIM_LABELS: Record<Dim, string> = {
  fund: "Fund",
  campaign: "Campaign",
  appeal: "Appeal",
  type: "Type",
};

const NONE = "—";

function dimValue(g: GiftRow, dim: Dim): string {
  switch (dim) {
    case "fund": return g.fund_name ?? NONE;
    case "campaign": return g.campaign_name ?? NONE;
    case "appeal": return g.appeal_name ?? NONE;
    case "type": return g.type;
  }
}

const PALETTE = [
  "#751411", // brand
  "#a15554",
  "#bd7978",
  "#d5a3a3",
  "#7a6e3a",
  "#a89858",
  "#3d6b6b",
  "#5d8e8e",
  "#5a4063",
  "#876195",
];

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtUsd2 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DonorChart({ gifts }: { gifts: GiftRow[] }) {
  const [dim, setDim] = useState<Dim>("fund");

  const { data, keys, grand, grandCount } = useMemo(() => {
    const byYear = new Map<string, Record<string, number>>();
    const keySet = new Set<string>();
    let grand = 0;
    let grandCount = 0;
    for (const g of gifts) {
      const year = g.date_received.slice(0, 4);
      const key = dimValue(g, dim);
      keySet.add(key);
      const row = byYear.get(year) ?? {};
      row[key] = (row[key] ?? 0) + Number(g.amount);
      byYear.set(year, row);
      grand += Number(g.amount);
      grandCount += 1;
    }
    const years = Array.from(byYear.keys()).sort();
    const keys = Array.from(keySet).sort((a, b) => {
      if (a === NONE) return 1;
      if (b === NONE) return -1;
      return a.localeCompare(b);
    });
    const data = years.map((y) => {
      const row: Record<string, number | string> = { year: y };
      for (const k of keys) row[k] = byYear.get(y)?.[k] ?? 0;
      return row;
    });
    return { data, keys, grand, grandCount };
  }, [gifts, dim]);

  if (gifts.length === 0) {
    return <div className="card p-8 text-center text-sm text-stone-500">No gifts recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 md:p-5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="chart-dim" className="label">Stack by</label>
          <select
            id="chart-dim"
            value={dim}
            onChange={(e) => setDim(e.target.value as Dim)}
            className="input w-44"
          >
            {(Object.keys(DIM_LABELS) as Dim[]).map((d) => (
              <option key={d} value={d}>{DIM_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500">All-time</div>
          <div className="font-serif text-2xl tabular-nums text-brand-700">
            {fmtUsd2(grand)}
          </div>
          <div className="text-xs text-stone-500">
            {grandCount} {grandCount === 1 ? "gift" : "gifts"}
          </div>
        </div>
      </div>

      <div className="card p-4 md:p-5">
        <div className="h-[360px] md:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: "#78716c", fontSize: 12 }}
                axisLine={{ stroke: "#d6d3d1" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#78716c", fontSize: 12 }}
                axisLine={{ stroke: "#d6d3d1" }}
                tickLine={false}
                tickFormatter={(v: number) => fmtUsd(v)}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "rgba(117, 20, 17, 0.04)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e7e5e4",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.12)",
                  fontSize: 12,
                }}
                formatter={(value, name) => [fmtUsd2(Number(value)), String(name)]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              {keys.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="a"
                  fill={PALETTE[i % PALETTE.length]}
                  radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
