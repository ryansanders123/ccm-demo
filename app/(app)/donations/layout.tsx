import { requireFeature } from "@/lib/org-context";

export default async function DonationsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("donations");
  return children;
}
