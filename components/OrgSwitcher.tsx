"use client";

import { useState, useTransition } from "react";
import { switchActiveOrg } from "@/lib/org-actions";

type MinimalOrg = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
};

export function OrgSwitcher({
  active,
  orgs,
}: {
  active: MinimalOrg;
  orgs: MinimalOrg[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (orgs.length <= 1) {
    // Don't render a switcher if the user only has one org.
    return null;
  }

  function pick(slug: string) {
    setOpen(false);
    startTransition(async () => {
      try {
        await switchActiveOrg(slug);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium text-stone-700 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors max-w-[200px]"
        disabled={pending}
        title="Switch organization"
      >
        {active.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
        )}
        <span className="truncate">{active.name}</span>
        <svg
          className="h-3.5 w-3.5 text-stone-400 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            className="absolute z-40 mt-1 right-0 min-w-[14rem] max-h-80 overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg py-1 text-sm"
            role="listbox"
          >
            {orgs.map((o) => {
              const isActive = o.id === active.id;
              return (
                <li key={o.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => pick(o.slug)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-stone-50 ${
                      isActive ? "font-medium text-brand-700 bg-brand-50/40" : "text-stone-700"
                    }`}
                    disabled={pending || isActive}
                  >
                    {o.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                    ) : (
                      <span className="h-5 w-5 rounded bg-stone-100 text-stone-500 text-[10px] flex items-center justify-center">
                        {o.slug.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{o.name}</span>
                    {isActive && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-stone-400">
                        active
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
