import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export type ArVrVhRow = {
  county: string | null;
  gender: string | null;
  age_segment: string | null;
  flg_dem: string | null;
  flg_rep: string | null;
  voting_recency: string | null;
  records: number;
};

export type UbiRow = {
  state: string;
  zip: string | null;
  ubi: number;
  households: number;
};

async function fetchAll<T extends Record<string, unknown>>(
  table: "ar_vr_vh_summary" | "accudata_ubi",
  columns: string,
): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .schema("pds")
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`load pds.${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as unknown as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function getArVrVhRows(): Promise<ArVrVhRow[]> {
  return fetchAll<ArVrVhRow>(
    "ar_vr_vh_summary",
    "county,gender,age_segment,flg_dem,flg_rep,voting_recency,records",
  );
}

export async function getUbiRows(): Promise<UbiRow[]> {
  return fetchAll<UbiRow>("accudata_ubi", "state,zip,ubi,households");
}
