import { requireFeature } from "@/lib/org-context";

export default async function ImportLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("import");
  return <>{children}</>;
}
