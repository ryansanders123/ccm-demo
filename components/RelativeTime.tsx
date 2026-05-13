"use client";

import { useEffect, useState } from "react";

const ABS_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const REL_FMT = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relative(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return REL_FMT.format(diffSec, "second");
  if (abs < 3600) return REL_FMT.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return REL_FMT.format(Math.round(diffSec / 3600), "hour");
  if (abs < 30 * 86400) return REL_FMT.format(Math.round(diffSec / 86400), "day");
  if (abs < 365 * 86400) return REL_FMT.format(Math.round(diffSec / (30 * 86400)), "month");
  return REL_FMT.format(Math.round(diffSec / (365 * 86400)), "year");
}

export function RelativeTime({ iso, fallback = "—" }: { iso: string | null; fallback?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!iso) return <span className="text-stone-400">{fallback}</span>;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span className="text-stone-400">{fallback}</span>;

  const absolute = ABS_FMT.format(d);
  const rel = now ? relative(iso, now) : "";

  return (
    <time dateTime={iso} title={d.toISOString()} className="tabular-nums">
      {absolute}
      {rel && <span className="text-stone-400"> ({rel})</span>}
    </time>
  );
}
