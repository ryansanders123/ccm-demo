import { requireFeature } from "@/lib/org-context";

export default async function ExportsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("exports");
  return <>{children}</>;
}
