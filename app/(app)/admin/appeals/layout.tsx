import { requireFeature } from "@/lib/org-context";

export default async function AppealsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("appeals");
  return <>{children}</>;
}
