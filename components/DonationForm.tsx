"use client";

import { useState } from "react";
import { DoneePicker } from "@/components/DoneePicker";
import { addDonation } from "@/app/(app)/donations/actions";
import { useRouter } from "next/navigation";

type Fund = { id: string; name: string };

export function DonationForm({ funds }: { funds: Fund[] }) {
  const router = useRouter();
  const [type, setType] = useState<"cash" | "check" | "online">("cash");
  const [doneeId, setDoneeId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addDonation({
        donee_id: doneeId,
        fund_id: fd.get("fund_id"),
        type,
        amount: String(fd.get("amount") ?? ""),
        date_received: String(fd.get("date_received") ?? ""),
        check_number: fd.get("check_number") ? String(fd.get("check_number")) : undefined,
        reference_id: fd.get("reference_id") ? String(fd.get("reference_id")) : undefined,
        note: fd.get("note") ? String(fd.get("note")) : undefined,
      });
      router.push("/report");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div>
        <label className="label">Type</label>
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200">
          {(["cash", "check", "online"] as const).map((t) => (
            <label
              key={t}
              className={`relative px-4 py-1.5 rounded-lg cursor-pointer capitalize text-sm font-medium transition-all select-none ${
                type === t
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-stone-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="label">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">
              $
            </span>
            <input
              id="amount"
              name="amount"
              required
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              placeholder="0.00"
              className="input pl-7"
            />
          </div>
        </div>

        <div>
          <label htmlFor="date_received" className="label">
            Date received
          </label>
          <input
            id="date_received"
            name="date_received"
            type="date"
            required
            defaultValue={today}
            className="input"
          />
        </div>
      </div>

      <DoneePicker onSelect={(d) => setDoneeId(d.id)} />

      <div>
        <label htmlFor="fund_id" className="label">
          Fund
        </label>
        <select id="fund_id" name="fund_id" required className="input">
          <option value="">Select a fund…</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {type === "check" && (
        <div className="animate-fade-in">
          <label htmlFor="check_number" className="label">
            Check number
          </label>
          <input id="check_number" name="check_number" required className="input" />
        </div>
      )}

      {type === "online" && (
        <div className="animate-fade-in">
          <label htmlFor="reference_id" className="label">
            Reference / transaction ID
          </label>
          <input id="reference_id" name="reference_id" required className="input" />
        </div>
      )}

      <div>
        <label htmlFor="note" className="label">
          Note <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>

      {err && (
        <div
          role="alert"
          className="p-3 bg-red-50 text-red-800 rounded-xl text-sm border border-red-200/70"
        >
          {err}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button disabled={saving || !doneeId} className="btn-primary">
          {saving ? "Saving…" : "Save donation"}
        </button>
        {!doneeId && (
          <span className="text-xs text-stone-500">Select a donee to enable save</span>
        )}
      </div>
    </form>
  );
}
