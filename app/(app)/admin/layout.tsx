import { redirect } from "next/navigation";
import { currentAppUser } from "@/lib/auth";
import { AdminSubNav } from "@/components/AdminSubNav";
import { getActiveOrg } from "@/lib/org-context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await currentAppUser();
  if (!u || u.role !== "admin") redirect("/");
  const activeOrg = await getActiveOrg();
  return (
    <>
      <AdminSubNav features={activeOrg?.features ?? {}} />
      {children}
    </>
  );
}
