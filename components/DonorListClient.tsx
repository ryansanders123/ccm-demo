"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DonorListRow } from "@/lib/donors";

type SortKey = "name" | "lifetime" | "last" | "count";

const PAGE_SIZE = 50;

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DonorListClient({ donors }: { donors: DonorListRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = donors;
    if (needle) {
      list = donors.filter((d) =>
        d.name.toLowerCase().includes(needle)
        || (d.email ?? "").toLowerCase().includes(needle)
        || (d.phone ?? "").toLowerCase().includes(needle)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "lifetime":
          return b.lifetime_total - a.lifetime_total;
        case "count":
          return b.gift_count - a.gift_count;
        case "last":
          return (b.last_gift_at ?? "").localeCompare(a.last_gift_at ?? "");
      }
    });
    return sorted;
  }, [donors, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const lifetimeShown = filtered.reduce((acc, d) => acc + d.lifetime_total, 0);
  const giftCountShown = filtered.reduce((acc, d) => acc + d.gift_count, 0);
  const avgGift = giftCountShown > 0 ? lifetimeShown / giftCountShown : 0;

  return (
    <>
      <form
        className="mb-6 card p-4 md:p-5 flex flex-wrap gap-4 items-end"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex-1 min-w-[260px]">
          <label htmlFor="donor-q" className="label">Search</label>
          <input
            id="donor-q"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Name, email, or phone…"
            className="input"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="donor-sort" className="label">Sort by</label>
          <select
            id="donor-sort"
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
            className="input w-48"
          >
            <option value="name">Name (A–Z)</option>
            <option value="lifetime">Lifetime $ (high → low)</option>
            <option value="last">Last gift (recent → old)</option>
            <option value="count"># gifts (high → low)</option>
          </select>
        </div>
      </form>

      <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Donors shown</div>
          <div className="font-serif text-2xl text-stone-900 tabular-nums">{filtered.length.toLocaleString()}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Lifetime giving</div>
          <div className="font-serif text-2xl text-brand-700 tabular-nums">{fmtUsd(lifetimeShown)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Avg gift size</div>
          <div className="font-serif text-2xl text-stone-900 tabular-nums">{fmtUsd(avgGift)}</div>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 border-b border-stone-200">
              <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-right px-4 py-3 font-medium">Lifetime</th>
                <th className="text-left px-4 py-3 font-medium">Last gift</th>
                <th className="text-right px-4 py-3 font-medium"># Gifts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {slice.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-900">
                    <Link href={`/donors/${d.id}`} className="hover:text-brand-700 hover:underline">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600 truncate max-w-[260px]">{d.email ?? ""}</td>
                  <td className="px-4 py-3 text-stone-600">{d.phone ?? ""}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-stone-900">
                    {fmtUsd(d.lifetime_total)}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{d.last_gift_at ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-700">{d.gift_count}</td>
                </tr>
              ))}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-stone-500">
                    No donors match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex gap-2 items-center">
        <button
          className="btn-secondary btn-sm disabled:opacity-50"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Prev
        </button>
        <span className="text-sm text-stone-500 px-1">
          Page {safePage} of {totalPages}
        </span>
        <button
          className="btn-secondary btn-sm disabled:opacity-50"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next →
        </button>
      </div>
    </>
  );
}
