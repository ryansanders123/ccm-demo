"use client";

import { useState } from "react";

export function TaxSummaryBulk({
  years,
  defaultYear,
}: {
  years: number[];
  defaultYear: number;
}) {
  const [year, setYear] = useState(defaultYear);
  const [threshold, setThreshold] = useState("0");

  function downloadHref(type: "summary" | "detail") {
    const p = new URLSearchParams({ type, year: String(year) });
    if (type === "summary" && threshold && Number(threshold) > 0) {
      p.set("threshold", threshold);
    }
    return `/admin/exports/download?${p.toString()}`;
  }

  return (
    <div className="card p-6 md:p-7">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="sm:col-span-1">
          <label htmlFor="bulk-year" className="label">Tax year</label>
          <select
            id="bulk-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="bulk-threshold" className="label">
            Min total <span className="font-normal text-stone-400">(USD)</span>
          </label>
          <input
            id="bulk-threshold"
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="input"
          />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <p className="text-xs text-stone-500 leading-snug">
            Threshold filters the summary export to donors who gave at least
            this amount in the year. <span className="font-medium">$250</span>{" "}
            is the IRS line for written acknowledgment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a
          href={downloadHref("summary")}
          className="card-interactive p-5 block group"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-brand-200 text-brand-700 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 7h4M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="font-serif text-lg text-stone-900 group-hover:text-brand-700 transition-colors">
            Summary CSV
          </div>
          <div className="text-sm text-stone-600 mt-1 text-pretty">
            One row per donor for {year}: name, address, total giving, gift
            count, by-fund breakdown, and an IRS $250 flag.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            Download
          </div>
        </a>
        <a
          href={downloadHref("detail")}
          className="card-interactive p-5 block group"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200 text-amber-800 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="font-serif text-lg text-stone-900 group-hover:text-brand-700 transition-colors">
            Detail CSV
          </div>
          <div className="text-sm text-stone-600 mt-1 text-pretty">
            One row per donation for {year}: date, type, fund, campaign, appeal,
            amount, check number / reference. Use for itemized lookups.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            Download
          </div>
        </a>
      </div>
    </div>
  );
}
