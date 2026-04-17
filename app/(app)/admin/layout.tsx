import { redirect } from "next/navigation";
import { currentAppUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await currentAppUser();
  if (!u || u.role !== "admin") redirect("/");
  return <>{children}</>;
}
