import { getArVrVhRows } from "@/lib/pds-db";
import { fmtInt, fmtPct1 } from "@/lib/report-format";
import { Sheet } from "@/components/reports/Sheet";
import { DashboardChrome } from "@/components/reports/DashboardChrome";
import { BarCell } from "@/components/reports/BarCell";
import { CountyMap } from "./CountyMap";
import { CountyClearLink } from "./CountyClearLink";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/reports/ar-vr-vh", label: "AR VR VH" },
  { href: "/reports/ubi", label: "UBI" },
];

type GenderAgeRow = { age_segment: string | null; gender: string | null; records: number };
type RecencyRow = { voting_recency: string | null; records: number };
type PartyRow = { flg_dem: string | null; flg_rep: string | null; records: number };

export default async function ARVRVHPage({
  searchParams,
}: {
  searchParams: Promise<{ county?: string }>;
}) {
  const sp = await searchParams;
  const selectedCounty = sp.county?.toUpperCase() || null;

  const rows = await getArVrVhRows();
  const selectedRows = selectedCounty
    ? rows.filter((row) => (row.county ?? "").toUpperCase() === selectedCounty)
    : rows;

  const countyTotals = groupSum(rows, (row) => row.county ?? "")
    .filter((row) => typeof row.county === "string")
    .map((row) => ({ county: row.county as string, records: row.records }));
  const demoRows = groupSum2(
    selectedRows,
    (row) => row.age_segment,
    (row) => row.gender,
    "age_segment",
    "gender",
  ) as GenderAgeRow[];
  const recencyRows = groupSum(selectedRows, (row) => row.voting_recency, "voting_recency") as RecencyRow[];
  const partyRows = groupSum2(
    selectedRows,
    (row) => row.flg_dem,
    (row) => row.flg_rep,
    "flg_dem",
    "flg_rep",
  ) as PartyRow[];

  return (
    <DashboardChrome
      title="Arkansas Voter Registration and Voter History"
      tabs={TABS}
      active="/reports/ar-vr-vh"
      controls={selectedCounty && <CountyClearLink county={selectedCounty} />}
    >
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-5">
          <Sheet title="Demographics">
            <DemographicsTable rows={demoRows} />
          </Sheet>
        </div>
        <div className="col-span-12 lg:col-span-3">
          <Sheet title="Voting Recency">
            <RecencyTable rows={recencyRows} />
          </Sheet>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Sheet title="Party Voted">
            <PartyTable rows={partyRows} />
          </Sheet>
        </div>
        <div className="col-span-12">
          <Sheet title="County Map">
            <div className="px-3 pt-2 pb-1 text-xs text-stone-500">
              Click a county to filter the tables above. Click again or use the &ldquo;Clear&rdquo; link to reset.
            </div>
            <div className="px-3 pb-3">
              <CountyMap totals={countyTotals} selected={selectedCounty} />
            </div>
          </Sheet>
        </div>
      </div>
    </DashboardChrome>
  );
}

function DemographicsTable({ rows }: { rows: GenderAgeRow[] }) {
  const ageOrder = uniqueOrdered(rows.map((r) => r.age_segment));
  const genders = uniqueOrdered(rows.map((r) => r.gender));
  const cell = (a: string | null, g: string | null) =>
    rows.find((r) => r.age_segment === a && r.gender === g)?.records ?? 0;
  const colTotal = (g: string | null) =>
    rows.filter((r) => r.gender === g).reduce((s, r) => s + r.records, 0);
  const rowTotal = (a: string | null) =>
    rows.filter((r) => r.age_segment === a).reduce((s, r) => s + r.records, 0);
  const total = rows.reduce((s, r) => s + r.records, 0);
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th className="row-h">Age</th>
          {genders.map((g) => (
            <th key={g ?? "_"}>{g ?? "—"}</th>
          ))}
          <th className="total-col">Total</th>
        </tr>
      </thead>
      <tbody>
        {ageOrder.map((a) => (
          <tr key={a ?? "_"}>
            <td className="row-h">{a ?? "—"}</td>
            {genders.map((g) => (
              <td key={g ?? "_"}>{fmtInt(cell(a, g))}</td>
            ))}
            <td className="total-col">{fmtInt(rowTotal(a))}</td>
          </tr>
        ))}
        <tr className="total-row">
          <td className="row-h">Total</td>
          {genders.map((g) => (
            <td key={g ?? "_"}>{fmtInt(colTotal(g))}</td>
          ))}
          <td>{fmtInt(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function RecencyTable({ rows }: { rows: RecencyRow[] }) {
  const total = rows.reduce((s, r) => s + r.records, 0);
  const ordered = [...rows].sort((a, b) =>
    (a.voting_recency ?? "").localeCompare(b.voting_recency ?? "")
  );
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th className="row-h">Years</th>
          <th>Records</th>
          <th>Percent</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((r) => {
          const pct = total ? r.records / total : 0;
          return (
            <tr key={r.voting_recency ?? "_"}>
              <td className="row-h">{r.voting_recency ?? "—"}</td>
              <td>{fmtInt(r.records)}</td>
              <BarCell text={total ? fmtPct1(pct) : ""} pct={pct} />
            </tr>
          );
        })}
        <tr className="total-row">
          <td className="row-h">Total</td>
          <td>{fmtInt(total)}</td>
          <td>{total ? fmtPct1(1) : ""}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PartyTable({ rows }: { rows: PartyRow[] }) {
  const total = rows.reduce((s, r) => s + r.records, 0);
  const groups = new Map<string, PartyRow[]>();
  for (const r of rows) {
    const k = r.flg_dem ?? "—";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const dems = Array.from(groups.keys()).sort();
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th className="row-h">Democrat</th>
          <th className="row-h">Republican</th>
          <th>Records</th>
          <th>Percent</th>
        </tr>
      </thead>
      <tbody>
        {dems.flatMap((d) => {
          const inner = (groups.get(d) ?? []).sort((a, b) =>
            (a.flg_rep ?? "").localeCompare(b.flg_rep ?? "")
          );
          return inner.map((r, i) => {
            const pct = total ? r.records / total : 0;
            return (
              <tr key={`${d}-${r.flg_rep ?? "_"}`}>
                {i === 0 && <td className="row-h" rowSpan={inner.length}>{d}</td>}
                <td className="row-h">{r.flg_rep ?? "—"}</td>
                <td>{fmtInt(r.records)}</td>
                <BarCell text={total ? fmtPct1(pct) : ""} pct={pct} />
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

function groupSum<T>(
  rows: Array<T & { records: number }>,
  keyFn: (row: T) => string | null,
  keyName = "county",
) {
  const groups = new Map<string, { value: string | null; records: number }>();
  for (const row of rows) {
    const value = keyFn(row);
    const key = value ?? "";
    const current = groups.get(key) ?? { value, records: 0 };
    current.records += Number(row.records);
    groups.set(key, current);
  }
  return Array.from(groups.values()).map((group) => ({
    [keyName]: group.value,
    records: group.records,
  }));
}

function groupSum2<T>(
  rows: Array<T & { records: number }>,
  keyAFn: (row: T) => string | null,
  keyBFn: (row: T) => string | null,
  keyAName: string,
  keyBName: string,
) {
  const groups = new Map<string, { a: string | null; b: string | null; records: number }>();
  for (const row of rows) {
    const a = keyAFn(row);
    const b = keyBFn(row);
    const key = `${a ?? ""}\u0000${b ?? ""}`;
    const current = groups.get(key) ?? { a, b, records: 0 };
    current.records += Number(row.records);
    groups.set(key, current);
  }
  return Array.from(groups.values()).map((group) => ({
    [keyAName]: group.a,
    [keyBName]: group.b,
    records: group.records,
  }));
}

function uniqueOrdered<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort((a, b) =>
    String(a ?? "").localeCompare(String(b ?? ""))
  );
}
