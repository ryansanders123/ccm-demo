import Link from "next/link";
import { TaxDoneePicker } from "@/components/TaxDoneePicker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TaxRow = {
  date_received: string;
  type: string;
  amount: string;
  funds: { name: string } | { name: string }[] | null;
};

type DoneeRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

const nameOf = (
  rel: { name: string } | { name: string }[] | null | undefined
): string => {
  if (!rel) return "";
  if (Array.isArray(rel)) return rel[0]?.name ?? "";
  return rel.name ?? "";
};

export default async function TaxSummaryPage({
  searchParams,
}: {
  searchParams: { donee?: string; year?: string };
}) {
  const year = parseInt(
    searchParams.year ?? String(new Date().getFullYear()),
    10
  );
  const doneeId = searchParams.donee;
  let rows: TaxRow[] = [];
  let donee: DoneeRow | null = null;
  let total = 0;

  if (doneeId) {
    const supabase = createSupabaseServerClient();
    const { data: d } = await supabase
      .from("donees")
      .select("*")
      .eq("id", doneeId)
      .single();
    donee = (d ?? null) as DoneeRow | null;
    const { data } = await supabase
      .from("donations")
      .select("date_received,type,amount,funds(name)")
      .eq("donee_id", doneeId)
      .is("voided_at", null)
      .gte("date_received", `${year}-01-01`)
      .lt("date_received", `${year + 1}-01-01`)
      .order("date_received");
    rows = (data ?? []) as TaxRow[];
    total = rows.reduce((s, r) => s + Number(r.amount), 0);
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 tracking-tight">
          Tax summary
        </h1>
        <p className="mt-2 text-stone-600">
          Generate an annual giving statement for any donor.
        </p>
      </header>

      <form
        className="mb-6 card p-4 md:p-5 flex flex-wrap gap-4 items-end"
        method="get"
      >
        <div className="flex-1 min-w-[240px]">
          <TaxDoneePicker defaultId={doneeId} />
        </div>
        <div>
          <label htmlFor="year" className="label">
            Year
          </label>
          <input
            id="year"
            type="number"
            name="year"
            defaultValue={year}
            className="input w-28"
          />
        </div>
        <button className="btn-primary">Apply</button>
      </form>

      {donee && (
        <>
          <div className="card p-6 mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
                {year} giving summary
              </div>
              <div className="font-serif text-2xl text-stone-900 tracking-tight">
                {donee.name}
              </div>
              <div className="text-sm text-stone-500 mt-0.5">
                {rows.length} {rows.length === 1 ? "contribution" : "contributions"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
                Total
              </div>
              <div className="font-serif text-3xl font-medium text-brand-700 tabular-nums">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href={`/tax-summary/export?donee=${doneeId}&year=${year}`}
              className="btn-outline"
            >
              Download CSV
            </Link>
            <Link
              href={`/tax-summary/${doneeId}/${year}/print`}
              className="btn-secondary"
              target="_blank"
            >
              Print view
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50/60 border-b border-stone-200">
                  <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Fund</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className="text-stone-800 hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 tabular-nums">
                        {r.date_received}
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip-neutral capitalize">{r.type}</span>
                      </td>
                      <td className="px-4 py-3">{nameOf(r.funds)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-stone-900">
                        ${Number(r.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-16 text-center text-stone-500 text-sm"
                      >
                        No donations for this donee in {year}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!donee && (
        <div className="card p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17V3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="font-serif text-xl text-stone-900 mb-1">
            Select a donor
          </div>
          <div className="text-sm text-stone-600">
            Start by searching for a donee above to view their {year} giving
            statement.
          </div>
        </div>
      )}
    </div>
  );
}
