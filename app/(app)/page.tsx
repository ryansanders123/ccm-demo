import { currentAppUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentAppUser();
  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="font-serif text-3xl text-brand mb-4">Welcome</h1>
      <p className="mb-6 text-gray-700">
        Signed in as <span className="font-medium">{user?.email}</span>
        {user?.role === "admin" && <span className="ml-2 text-xs uppercase tracking-wide text-brand">Admin</span>}
      </p>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="font-serif text-lg text-brand mb-3">Phase 1 complete</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>Authentication (Google / Microsoft SSO)</li>
          <li>Invite-based gating</li>
          <li>Supabase schema + RLS</li>
        </ul>
        <h2 className="font-serif text-lg text-brand mt-6 mb-3">Coming next</h2>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>Add Donation (Phase 2)</li>
          <li>Reports + Tax Summary (Phase 3)</li>
          <li>Admin: Funds &amp; Users (Phase 4)</li>
        </ul>
      </div>
    </main>
  );
}
