import { requireFeature } from "@/lib/org-context";

export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("reports");
  return children;
}
