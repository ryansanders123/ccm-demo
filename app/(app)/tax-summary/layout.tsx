import { requireFeature } from "@/lib/org-context";

export default async function TaxSummaryLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("tax_summary");
  return <>{children}</>;
}
