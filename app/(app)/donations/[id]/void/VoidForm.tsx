"use client";

import Link from "next/link";
import { useState } from "react";

const MIN_REASON = 20;

export function VoidForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasonOk = reason.trim().length >= MIN_REASON;
  const confirmOk = confirm.trim() === "VOID";
  const canSubmit = reasonOk && confirmOk && !submitting;

  return (
    <form
      action={async (fd) => {
        setSubmitting(true);
        try {
          await action(fd);
        } catch (e) {
          setSubmitting(false);
          throw e;
        }
      }}
      className="space-y-5"
    >
      <div>
        <label htmlFor="reason" className="label">
          Reason <span className="text-red-700">*</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          minLength={MIN_REASON}
          maxLength={500}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Explain why in at least ${MIN_REASON} characters (e.g. duplicate entry, returned check).`}
          className="input"
        />
        <div className="mt-1 text-xs text-stone-500 flex justify-between">
          <span className={reasonOk ? "text-emerald-700" : ""}>
            {reasonOk
              ? "Long enough"
              : `${reason.trim().length} / ${MIN_REASON} minimum`}
          </span>
          <span>{reason.length} / 500</span>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" className="label">
          Type <span className="font-mono font-semibold text-red-700">VOID</span> to confirm{" "}
          <span className="text-red-700">*</span>
        </label>
        <input
          id="confirm"
          name="confirm"
          type="text"
          required
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input font-mono tracking-wider"
          placeholder="VOID"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canSubmit}
          type="submit"
        >
          {submitting ? "Voiding…" : "Void donation"}
        </button>
        <Link href="/report" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
