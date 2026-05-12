import { requireFeature } from "@/lib/org-context";

export default async function CampaignsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("campaigns");
  return <>{children}</>;
}
