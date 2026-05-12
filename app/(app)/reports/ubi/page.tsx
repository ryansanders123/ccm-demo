import { getUbiRows } from "@/lib/pds-db";
import { Sheet } from "@/components/reports/Sheet";
import { DashboardChrome } from "@/components/reports/DashboardChrome";
import { ZipMap } from "./ZipMap";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/reports/ar-vr-vh", label: "AR VR VH" },
  { href: "/reports/ubi", label: "UBI" },
];

type ZipRow = { zip: string; avg_ubi: number; households: number };

export default async function UBIPage() {
  const sourceRows = await getUbiRows();
  const byZip = new Map<string, { weighted: number; households: number }>();
  for (const row of sourceRows) {
    if (row.state !== "AR" || !row.zip) continue;
    const current = byZip.get(row.zip) ?? { weighted: 0, households: 0 };
    current.weighted += Number(row.ubi) * Number(row.households);
    current.households += Number(row.households);
    byZip.set(row.zip, current);
  }
  const rows: ZipRow[] = Array.from(byZip.entries()).map(([zip, value]) => ({
    zip,
    avg_ubi: value.households ? value.weighted / value.households : 0,
    households: value.households,
  }));

  return (
    <DashboardChrome
      title="Arkansas Underbanked Heat Map"
      tabs={TABS}
      active="/reports/ubi"
    >
      <Sheet title="UBI by ZIP">
        <div className="p-3">
          <ZipMap rows={rows} />
        </div>
      </Sheet>
    </DashboardChrome>
  );
}
