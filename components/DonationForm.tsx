"use client";

import { useState } from "react";
import { DoneePicker } from "@/components/DoneePicker";
import { addDonation } from "@/app/(app)/donations/actions";
import { useRouter } from "next/navigation";

type Lookup = { id: string; name: string };

export function DonationForm({
  funds,
  campaigns,
  appeals,
}: {
  funds: Lookup[];
  campaigns: Lookup[];
  appeals: Lookup[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"cash" | "check" | "online">("cash");
  const [doneeId, setDoneeId] = useState<string | null>(null);
  const [fundId, setFundId] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [appealId, setAppealId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const taxonomyChosen = !!(fundId || campaignId || appealId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addDonation({
        donee_id: doneeId,
        fund_id: fundId || null,
        campaign_id: campaignId || null,
        appeal_id: appealId || null,
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

      <div className="space-y-3 p-4 rounded-xl border border-stone-200 bg-stone-50/40">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
          Categorization <span className="font-normal normal-case tracking-normal text-stone-400">— pick at least one</span>
        </div>
        <div>
          <label htmlFor="fund_id" className="label">
            Fund <span className="font-normal text-stone-400">(where the money goes)</span>
          </label>
          <select
            id="fund_id"
            value={fundId}
            onChange={(e) => setFundId(e.target.value)}
            className="input"
          >
            <option value="">— none —</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="campaign_id" className="label">
            Campaign <span className="font-normal text-stone-400">(what the goal is)</span>
          </label>
          <select
            id="campaign_id"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="input"
          >
            <option value="">— none —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="appeal_id" className="label">
            Appeal <span className="font-normal text-stone-400">(how we asked)</span>
          </label>
          <select
            id="appeal_id"
            value={appealId}
            onChange={(e) => setAppealId(e.target.value)}
            className="input"
          >
            <option value="">— none —</option>
            {appeals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {!taxonomyChosen && (
          <div className="text-xs text-amber-700">
            Pick at least one of Fund, Campaign, or Appeal before saving.
          </div>
        )}
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
        <button disabled={saving || !doneeId || !taxonomyChosen} className="btn-primary">
          {saving ? "Saving…" : "Save donation"}
        </button>
        {!doneeId && (
          <span className="text-xs text-stone-500">Select a donee to enable save</span>
        )}
        {doneeId && !taxonomyChosen && (
          <span className="text-xs text-stone-500">Pick at least one of Fund / Campaign / Appeal</span>
        )}
      </div>
    </form>
  );
}
