import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { onboardOrganization } from "@/lib/org-actions";

export default async function OrganizationsPage() {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select(
      "id, slug, name, logo_url, primary_color, support_email, features, created_at",
    )
    .order("created_at", { ascending: true });

  async function create(fd: FormData) {
    "use server";
    await onboardOrganization({
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      logo_url: nullify(fd.get("logo_url")),
      primary_color: nullify(fd.get("primary_color")),
      adminEmail: String(fd.get("admin_email") ?? ""),
    });
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <header className="mb-6">
        <h1 className="page-title">Organizations</h1>
        <p className="page-subtitle">
          Each tenant on the platform. Onboard a new org by creating it and seating its first admin.
        </p>
      </header>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Onboard a new organization</h2>
        <form action={create} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="org-slug">Slug</label>
            <input
              id="org-slug"
              name="slug"
              required
              placeholder="acme"
              className="input"
              pattern="^[a-z0-9][a-z0-9-]*$"
              title="lowercase letters/digits/hyphens"
            />
            <p className="text-xs text-stone-500 mt-1">Lowercase, hyphenated. Used in URLs and joins.</p>
          </div>
          <div>
            <label className="label" htmlFor="org-name">Display name</label>
            <input
              id="org-name"
              name="name"
              required
              placeholder="Acme Catholic Mission"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="org-logo">Logo URL (optional)</label>
            <input
              id="org-logo"
              name="logo_url"
              placeholder="/logo.png or https://…"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="org-color">Brand color (optional)</label>
            <input
              id="org-color"
              name="primary_color"
              placeholder="#751411"
              className="input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="org-admin">First admin email</label>
            <input
              id="org-admin"
              name="admin_email"
              type="email"
              required
              placeholder="admin@acme.org"
              className="input"
            />
            <p className="text-xs text-stone-500 mt-1">
              Will be invited as the org&apos;s admin (existing user rows are reused).
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary">Create organization</button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/60 border-b border-stone-200">
              <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                <th className="text-left px-4 py-3 font-medium">Org</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Brand</th>
                <th className="text-left px-4 py-3 font-medium">Support email</th>
                <th className="text-left px-4 py-3 font-medium">Features</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(!orgs || orgs.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-500">
                    No organizations yet.
                  </td>
                </tr>
              )}
              {(orgs ?? []).map((o) => {
                const features = (o.features ?? {}) as Record<string, boolean>;
                const enabled = Object.entries(features)
                  .filter(([, v]) => v)
                  .map(([k]) => k);
                return (
                  <tr key={o.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3 flex items-center gap-2">
                      {o.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                      ) : (
                        <span className="h-6 w-6 rounded bg-stone-100 text-stone-500 text-[10px] flex items-center justify-center">
                          {o.slug.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-medium">{o.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.slug}</td>
                    <td className="px-4 py-3">
                      {o.primary_color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded border border-stone-200"
                            style={{ backgroundColor: o.primary_color }}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-xs text-stone-600">{o.primary_color}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">{o.support_email ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {enabled.length === 0 ? "—" : enabled.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/organizations/${o.id}`} className="btn-secondary btn-sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function nullify(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s.length === 0 ? undefined : s;
}
