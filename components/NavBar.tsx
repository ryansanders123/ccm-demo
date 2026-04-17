import Link from "next/link";
import type { AppUser } from "@/lib/auth";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";
const LOGO = process.env.NEXT_PUBLIC_ORG_LOGO_URL ?? "/logo.png";

export function NavBar({ user }: { user: AppUser }) {
  const isAdmin = user.role === "admin";
  const initials = (user.email ?? "?")
    .split("@")[0]
    .split(/[._-]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-3 mr-auto group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt={ORG} className="h-9 w-auto" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif text-[17px] text-brand-700 tracking-tight group-hover:text-brand-800 transition-colors">
              {ORG}
            </span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-stone-400">
              Donation Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-0.5 md:gap-1">
          <NavLink href="/donations/add">Add Donation</NavLink>
          <NavLink href="/report">Report</NavLink>
          <NavLink href="/tax-summary">Tax Summary</NavLink>
          {isAdmin && <NavLink href="/admin/funds">Funds</NavLink>}
          {isAdmin && <NavLink href="/admin/users">Users</NavLink>}
        </div>

        <div className="flex items-center gap-2 ml-2 pl-2 md:pl-3 md:ml-3 border-l border-stone-200">
          <div className="hidden md:flex items-center gap-2 pr-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-800 flex items-center justify-center text-xs font-semibold ring-1 ring-brand-200/60">
              {initials || "?"}
            </div>
            <div className="flex flex-col leading-tight max-w-[160px]">
              <span className="text-xs font-medium text-stone-800 truncate">
                {user.email}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">
                {isAdmin ? "Admin" : "Member"}
              </span>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="inline">
            <button
              type="submit"
              className="btn-ghost btn-sm"
              title="Sign out"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2.5 md:px-3 py-2 text-sm text-stone-600 hover:text-brand-700 hover:bg-stone-100 rounded-lg transition-colors font-medium"
    >
      {children}
    </Link>
  );
}
