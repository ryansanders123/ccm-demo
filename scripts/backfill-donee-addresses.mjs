#!/usr/bin/env node
// Backfill donees.address_line1/2, city, state, zip from the original
// transactions CSV. The import script created donees with names derived from
// CSV `first_name`/`last_name`/`company_name`, so we re-derive the same name
// per CSV row and UPDATE the matching donee. Last write wins per donee, which
// is fine for an address.
//
// Usage:
//   SUPABASE_DB_URL="postgresql://..." \
//   CSV_PATH="C:/Users/rsanders/Downloads/Supabase Snippet List All Transactions (1).csv" \
//     node scripts/backfill-donee-addresses.mjs

import fs from "node:fs";
import pg from "pg";

const CONNECTION_STRING = process.env.SUPABASE_DB_URL;
const CSV_PATH = process.env.CSV_PATH;
if (!CONNECTION_STRING) { console.error("SUPABASE_DB_URL required"); process.exit(1); }
if (!CSV_PATH) { console.error("CSV_PATH required"); process.exit(1); }

const { Client } = pg;

function parseLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = parseLine(lines.shift());
const rows = lines.map((l) => {
  const parts = parseLine(l);
  const obj = {};
  header.forEach((h, i) => { obj[h] = parts[i]; });
  return obj;
});

const nullify = (v) => (v == null || v === "" || v === "null" || v === "NULL") ? null : v;
const buildName = (r) => {
  const f = nullify(r.first_name);
  const l = nullify(r.last_name);
  const co = nullify(r.company_name);
  if (f && l) return `${f} ${l}`.trim();
  if (l) return l;
  if (f) return f;
  if (co) return co;
  return "Anonymous";
};

// Aggregate addresses by name; last non-empty wins.
const byName = new Map();
for (const r of rows) {
  const name = buildName(r);
  const next = {
    address_line1: nullify(r.address_line1),
    address_line2: nullify(r.address_line2),
    city: nullify(r.city),
    state: nullify(r.state),
    zip: nullify(r.zip),
  };
  if (!next.address_line1 && !next.city && !next.zip) continue;
  byName.set(name, next);
}

console.log(`CSV rows: ${rows.length}, donees with address data: ${byName.size}`);

const client = new Client({ connectionString: CONNECTION_STRING });

async function main() {
  await client.connect();
  console.log("Connected.");

  let updated = 0;
  let missing = 0;
  for (const [name, addr] of byName) {
    const res = await client.query(
      `UPDATE public.donees
         SET address_line1 = $1,
             address_line2 = $2,
             city          = $3,
             state         = $4,
             zip           = $5
       WHERE name = $6`,
      [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.zip, name]
    );
    if (res.rowCount > 0) updated++;
    else missing++;
  }
  console.log(`Donees updated: ${updated}, name not found in DB: ${missing}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await client.end(); } catch {}
  process.exit(1);
});
