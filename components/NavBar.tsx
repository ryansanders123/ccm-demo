import Link from "next/link";
import type { AppUser } from "@/lib/auth";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";

export function NavBar({ user }: { user: AppUser }) {
  const isAdmin = user.role === "admin";
  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4">
        <Link href="/" className="font-serif text-lg mr-auto">{ORG}</Link>
        <Link href="/donations/add" className="text-sm hover:underline">Add Donation</Link>
        <Link href="/report"        className="text-sm hover:underline">Report</Link>
        <Link href="/tax-summary"   className="text-sm hover:underline">Tax Summary</Link>
        {isAdmin && <Link href="/admin/funds" className="text-sm hover:underline">Funds</Link>}
        {isAdmin && <Link href="/admin/users" className="text-sm hover:underline">Users</Link>}
        <form action="/auth/signout" method="post" className="inline">
          <button type="submit" className="text-sm hover:underline">Logout</button>
        </form>
      </div>
    </nav>
  );
}
