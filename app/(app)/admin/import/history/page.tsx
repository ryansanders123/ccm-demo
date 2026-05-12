import { listBatches, revertBatch } from "../actions";

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  applied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  reverted: "border-stone-300 bg-stone-100 text-stone-600",
};

export default async function ImportHistoryPage() {
  const batches = await listBatches();

  async function doRevert(fd: FormData) {
    "use server";
    await revertBatch(String(fd.get("id")));
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="page-title">Import history</h1>
          <p className="page-subtitle">Past CSV uploads — revert a batch to remove every donation it inserted.</p>
        </div>
        <a className="btn-primary" href="/admin/import">New import</a>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 border-b border-stone-200">
              <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                <th className="text-left px-4 py-3 font-medium">When</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium">Inserted</th>
                <th className="text-right px-4 py-3 font-medium">Duplicate</th>
                <th className="text-right px-4 py-3 font-medium">Skipped</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-stone-500">
                    No imports yet. <a className="link" href="/admin/import">Upload a CSV</a>.
                  </td>
                </tr>
              )}
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.source_name}</td>
                  <td className="px-4 py-3 text-stone-600 max-w-[18rem] truncate" title={b.file_name}>
                    {b.file_name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{b.rows_total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {b.rows_inserted.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                    {b.rows_duplicate.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                    {b.rows_skipped.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip border ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {b.status === "applied" && (
                      <form action={doRevert}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="btn-secondary btn-sm">Revert</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
