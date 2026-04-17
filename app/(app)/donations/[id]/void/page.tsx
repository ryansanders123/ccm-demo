import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { voidDonation } from "@/app/(app)/donations/actions";

export default async function VoidPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: d } = await supabase
    .from("donations")
    .select("id,amount,date_received,type,donees(name),funds(name),voided_at")
    .eq("id", params.id)
    .single();

  if (!d) {
    return (
      <div className="max-w-xl animate-fade-in">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 tracking-tight">
          Void donation
        </h1>
        <div className="card p-6 text-stone-600">Donation not found.</div>
      </div>
    );
  }
  if (d.voided_at) {
    return (
      <div className="max-w-xl animate-fade-in">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 tracking-tight">
          Void donation
        </h1>
        <div className="card p-6 text-stone-600">This donation is already voided.</div>
      </div>
    );
  }

  async function submit(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") ?? "").trim();
    await voidDonation({ id: params.id, reason });
    redirect("/report");
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 tracking-tight">
          Void donation
        </h1>
        <p className="mt-2 text-stone-600">
          Voiding preserves the record but excludes it from totals. A reason is required.
        </p>
      </header>

      <div className="card p-6 md:p-8">
        <div className="mb-6 p-4 bg-gradient-to-br from-brand-50 to-stone-50 border border-brand-100 rounded-xl">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
            Donation
          </div>
          <div className="text-base font-medium text-stone-900">
            {(d as unknown as { donees?: { name?: string } }).donees?.name}{" "}
            <span className="text-stone-400">·</span>{" "}
            <span className="text-brand-700">${d.amount}</span>{" "}
            <span className="text-stone-400">·</span>{" "}
            <span className="capitalize">{d.type}</span>{" "}
            <span className="text-stone-400">·</span>{" "}
            {(d as unknown as { funds?: { name?: string } }).funds?.name}
          </div>
          <div className="text-sm text-stone-600 mt-1">{d.date_received}</div>
        </div>
        <form action={submit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="label">
              Reason <span className="text-red-700">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              minLength={1}
              maxLength={500}
              rows={3}
              placeholder="Why is this donation being voided?"
              className="input"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="btn-danger">Void donation</button>
            <Link href="/report" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
