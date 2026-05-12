import { requireFeature } from "@/lib/org-context";

export default async function DonorsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("donors");
  return children;
}
