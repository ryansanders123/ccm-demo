import { redirect } from "next/navigation";
import { currentAppUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { getActiveOrg, listUserOrgs } from "@/lib/org-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAppUser();
  if (!user) redirect("/login");
  const [activeOrg, userOrgs] = await Promise.all([getActiveOrg(), listUserOrgs()]);
  return (
    <div className="min-h-screen app-backdrop">
      <NavBar user={user} activeOrg={activeOrg} userOrgs={userOrgs} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
