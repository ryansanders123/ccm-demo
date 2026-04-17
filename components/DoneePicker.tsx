"use client";

import { useEffect, useRef, useState } from "react";
import { searchDonees, createDonee } from "@/app/(app)/donations/actions";

type Donee = { id: string; name: string; email: string | null; phone: string | null };

export function DoneePicker({ onSelect }: { onSelect: (d: Donee) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Donee[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Donee | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFields, setNewFields] = useState({ email: "", phone: "", address: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const rows = await searchDonees(q);
      setResults(rows);
      setOpen(true);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function pick(d: Donee) {
    setSelected(d);
    setQ(d.name);
    setOpen(false);
    onSelect(d);
  }

  async function doCreate() {
    const d = await createDonee({ name: q.trim(), ...newFields });
    pick(d as Donee);
    setCreating(false);
    setNewFields({ email: "", phone: "", address: "" });
  }

  const hasExactMatch = results.some(
    (r) => r.name.toLowerCase() === q.trim().toLowerCase()
  );

  return (
    <div className="relative">
      <label htmlFor="donee-input" className="label">
        Donee
      </label>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          id="donee-input"
          className="input pl-9"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSelected(null);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          placeholder="Search donees by name…"
          role="combobox"
          aria-expanded={open}
          aria-controls="donee-picker-listbox"
          aria-autocomplete="list"
        />
      </div>
      {open && (
        <div
          id="donee-picker-listbox"
          role="listbox"
          className="absolute z-20 mt-1.5 w-full bg-white border border-stone-200 rounded-xl shadow-pop max-h-64 overflow-auto py-1 animate-fade-in"
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={selected?.id === r.id}
              onClick={() => pick(r)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-stone-50 focus:bg-stone-50 focus:outline-none transition-colors"
            >
              <div className="font-medium text-stone-900">{r.name}</div>
              {(r.email || r.phone) && (
                <div className="text-xs text-stone-500 mt-0.5">
                  {[r.email, r.phone].filter(Boolean).join(" · ")}
                </div>
              )}
            </button>
          ))}
          {q.trim().length >= 2 && !hasExactMatch && (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-brand-700 font-medium hover:bg-brand-50 focus:bg-brand-50 focus:outline-none border-t border-stone-100 mt-1 pt-2 transition-colors"
            >
              + Create new: &ldquo;{q.trim()}&rdquo;
            </button>
          )}
          {results.length === 0 && q.trim().length >= 2 && hasExactMatch === false && null}
        </div>
      )}
      {creating && (
        <div className="mt-3 p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-2.5 animate-fade-in">
          <div className="text-sm font-medium text-stone-800">
            New donee:{" "}
            <span className="text-brand-700 font-serif">{q.trim()}</span>
          </div>
          <input
            className="input text-sm"
            placeholder="Email (optional)"
            value={newFields.email}
            onChange={(e) =>
              setNewFields((f) => ({ ...f, email: e.target.value }))
            }
          />
          <input
            className="input text-sm"
            placeholder="Phone (optional)"
            value={newFields.phone}
            onChange={(e) =>
              setNewFields((f) => ({ ...f, phone: e.target.value }))
            }
          />
          <input
            className="input text-sm"
            placeholder="Address (optional)"
            value={newFields.address}
            onChange={(e) =>
              setNewFields((f) => ({ ...f, address: e.target.value }))
            }
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={doCreate} className="btn-primary btn-sm">
              Create donee
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {selected && <input type="hidden" name="donee_id" value={selected.id} />}
    </div>
  );
}
