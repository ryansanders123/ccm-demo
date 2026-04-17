import Link from "next/link";
import type { AppUser } from "@/lib/auth";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";
const LOGO = process.env.NEXT_PUBLIC_ORG_LOGO_URL ?? "/logo.png";

export function NavBar({ user }: { user: AppUser }) {
  const isAdmin = user.role === "admin";
  return (
    <nav className="border-b-4 border-brand bg-white px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4">
        <Link href="/" className="flex items-center gap-3 mr-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt={ORG} className="h-10 w-auto" />
          <span className="font-serif text-lg text-brand hidden sm:inline">{ORG}</span>
        </Link>
        <Link href="/donations/add" className="text-sm hover:text-brand hover:underline">Add Donation</Link>
        <Link href="/report"        className="text-sm hover:text-brand hover:underline">Report</Link>
        <Link href="/tax-summary"   className="text-sm hover:text-brand hover:underline">Tax Summary</Link>
        {isAdmin && <Link href="/admin/funds" className="text-sm hover:text-brand hover:underline">Funds</Link>}
        {isAdmin && <Link href="/admin/users" className="text-sm hover:text-brand hover:underline">Users</Link>}
        <form action="/auth/signout" method="post" className="inline">
          <button type="submit" className="text-sm hover:text-brand hover:underline">Logout</button>
        </form>
      </div>
    </nav>
  );
}
