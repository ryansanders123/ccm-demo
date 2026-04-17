import { redirect } from "next/navigation";
import { currentAppUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAppUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar user={user} />
      <main className="max-w-5xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
