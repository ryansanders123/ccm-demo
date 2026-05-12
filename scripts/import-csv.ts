#!/usr/bin/env tsx
// scripts/import-csv.ts
// CLI wrapper around lib/import/* for batch imports without going through
// the web UI. Useful for very large files, automated workflows, or
// integration smoke tests.
//
// Auth: uses the Supabase service-role key so RLS is bypassed. We
// therefore set organization_id explicitly on every insert — apply.ts
// honors ApplyContext.organizationId when set.
//
// Usage (run with tsx, installed as devDep):
//   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   ADMIN_EMAIL=rpsanders01@gmail.com \
//   npx tsx scripts/import-csv.ts --csv ./GiveCentral.csv --source GiveCentral --org ccmc [--apply]
//
// Without --apply the script does a dry-run (parse + normalize + counts).

import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseCsv } from "../lib/import/parse";
import { autoDetect, detectionsToMapping } from "../lib/import/autoDetect";
import { normalizeRows } from "../lib/import/normalize";
import {
  applyChunk,
  loadDedupIndex,
  loadDoneeIndex,
  loadTaxonomyCache,
} from "../lib/import/apply";

type Args = {
  csv?: string;
  source?: string;
  org?: string;
  mapping?: string;
  apply: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--csv") out.csv = argv[++i];
    else if (a === "--source") out.source = argv[++i];
    else if (a === "--org") out.org = argv[++i];
    else if (a === "--mapping") out.mapping = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.csv || !args.source || !args.org) {
  console.error(
    "Usage: npx tsx scripts/import-csv.ts --csv <path> --source <name> --org <slug> [--apply] [--mapping <path>]",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rpsanders01@gmail.com";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const text = await fs.readFile(args.csv!, "utf8");
  const fileHash = createHash("sha256").update(text).digest("hex");
  const { headers, rows } = parseCsv(text);
  console.log(`Parsed ${rows.length} rows / ${headers.length} columns from ${args.csv}`);

  let mapping;
  if (args.mapping) {
    mapping = JSON.parse(await fs.readFile(args.mapping, "utf8"));
  } else {
    mapping = detectionsToMapping(autoDetect(headers));
    console.log("Auto-detected mapping:");
    for (const [k, v] of Object.entries(mapping.columns)) {
      console.log(`  ${k.padEnd(22)} ← ${v}`);
    }
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", args.org!)
    .single();
  if (orgErr || !org) {
    console.error(`Could not find organization "${args.org}": ${orgErr?.message ?? "not found"}`);
    process.exit(1);
  }
  console.log(`Org: ${org.name} (${org.slug}) → ${org.id}`);

  const { data: admin, error: adminErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .single();
  if (adminErr || !admin) {
    console.error(`Could not find admin "${ADMIN_EMAIL}": ${adminErr?.message ?? "not found"}`);
    process.exit(1);
  }

  const { rows: normalized, errors: nErrors } = normalizeRows(rows, mapping);
  console.log(`Normalized ${normalized.length} rows; ${nErrors.length} errors`);
  if (nErrors.length) {
    for (const e of nErrors.slice(0, 5)) console.log(`  row ${e.rowIndex + 2}: ${e.reason}`);
    if (nErrors.length > 5) console.log(`  ... and ${nErrors.length - 5} more`);
  }

  if (!args.apply) {
    console.log("DRY RUN — pass --apply to actually insert.");
    return;
  }

  const { data: batch, error: bErr } = await supabase
    .from("import_batches")
    .insert({
      organization_id: org.id,
      source_name: args.source!,
      file_name: args.csv!,
      file_size: text.length,
      file_hash: fileHash,
      mapping,
      rows_total: rows.length,
      created_by: admin.id,
      status: "pending",
    })
    .select("id")
    .single();
  if (bErr || !batch) {
    console.error(`createBatch: ${bErr?.message}`);
    process.exit(1);
  }
  console.log(`Batch ${batch.id} opened`);

  const [doneeIndex, dedupIndex, taxonomy] = await Promise.all([
    loadDoneeIndex(supabase, args.source!),
    loadDedupIndex(supabase),
    loadTaxonomyCache(supabase),
  ]);
  console.log(
    `Loaded indices: ${doneeIndex.byEmail.size} email-keyed, ${doneeIndex.byExternalRef.size} ext-ref-keyed, ${dedupIndex.externalIds.size} existing external_ids`,
  );

  const CHUNK = 500;
  const totals = { inserted: 0, duplicates: 0, errors: 0, doneesCreated: 0, doneesMatched: 0 };
  for (let i = 0; i < normalized.length; i += CHUNK) {
    const chunk = normalized.slice(i, i + CHUNK);
    const r = await applyChunk(
      {
        supabase,
        doneeIndex,
        dedupIndex,
        taxonomy,
        mapping,
        sourceName: args.source!,
        importBatchId: batch.id,
        createdBy: admin.id,
        organizationId: org.id,
      },
      chunk,
    );
    totals.inserted += r.inserted;
    totals.duplicates += r.duplicates;
    totals.errors += r.errors.length;
    totals.doneesCreated += r.doneesCreated;
    totals.doneesMatched += r.doneesMatched;
    console.log(
      `  chunk ${i}-${Math.min(i + CHUNK, normalized.length)}: inserted=${r.inserted} duplicates=${r.duplicates} errors=${r.errors.length}`,
    );
  }

  await supabase
    .from("import_batches")
    .update({
      status: "applied",
      applied_at: new Date().toISOString(),
      rows_inserted: totals.inserted,
      rows_skipped: totals.errors + nErrors.length,
      rows_duplicate: totals.duplicates,
    })
    .eq("id", batch.id);

  console.log("\nDONE");
  console.log(`  inserted: ${totals.inserted}`);
  console.log(`  duplicates: ${totals.duplicates}`);
  console.log(`  errors: ${totals.errors + nErrors.length}`);
  console.log(`  donees created: ${totals.doneesCreated}`);
  console.log(`  donees matched: ${totals.doneesMatched}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
