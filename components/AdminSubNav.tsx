"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/funds", label: "Funds" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/appeals", label: "Appeals" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/users", label: "Users" },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 -mt-2 border-b border-stone-200/70">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "text-brand-700"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {it.label}
              {active && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand-600 rounded-t" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
