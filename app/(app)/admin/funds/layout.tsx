import { requireFeature } from "@/lib/org-context";

export default async function FundsLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("funds");
  return children;
}
