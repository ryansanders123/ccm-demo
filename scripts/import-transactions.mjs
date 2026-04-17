#!/usr/bin/env node
// Import test transactions from CSV with batched multi-row inserts.

import fs from "node:fs";
import pg from "pg";

const CONNECTION_STRING = process.env.SUPABASE_DB_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rpsanders01@gmail.com";
const CSV_PATH = process.env.CSV_PATH;
const CHUNK = 500;

if (!CONNECTION_STRING) { console.error("SUPABASE_DB_URL required"); process.exit(1); }
if (!CSV_PATH) { console.error("CSV_PATH required"); process.exit(1); }

const { Client } = pg;

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines.shift().split(",");
const rows = lines.map((line) => {
  const parts = line.split(",");
  const obj = {};
  header.forEach((h, i) => { obj[h] = parts[i]; });
  return obj;
});

const nullify = (v) => (v == null || v === "" || v === "null" || v === "NULL") ? null : v;

function buildName(r) {
  const f = nullify(r.first_name);
  const l = nullify(r.last_name);
  const co = nullify(r.company_name);
  if (f && l) return `${f} ${l}`.trim();
  if (l) return l;
  if (f) return f;
  if (co) return co;
  return "Anonymous";
}

function buildAddress(r) {
  const a1 = nullify(r.address_line1);
  const a2 = nullify(r.address_line2);
  const city = nullify(r.city);
  const st = nullify(r.state);
  const zip = nullify(r.zip);
  const parts = [];
  if (a1) parts.push(a1);
  if (a2) parts.push(a2);
  const csz = [city, st, zip].filter(Boolean).join(", ");
  if (csz) parts.push(csz);
  return parts.length ? parts.join(", ") : null;
}

function cleanEmail(e) {
  const v = nullify(e);
  if (!v) return null;
  if (/noemail/i.test(v)) return null;
  return v.toLowerCase();
}

function doneeKey(r) {
  const cid = nullify(r.constituent_id) ?? nullify(r.household_id);
  const name = buildName(r);
  const addr = buildAddress(r);
  return cid ? `cid:${cid}` : `na:${name.toLowerCase()}|${(addr ?? "").toLowerCase()}`;
}

// Dedupe donees
const doneesByKey = new Map();
for (const r of rows) {
  const key = doneeKey(r);
  const name = buildName(r);
  const addr = buildAddress(r);
  const email = cleanEmail(r.email);
  const phone = nullify(r.phone);
  if (!doneesByKey.has(key)) {
    doneesByKey.set(key, { key, name, email, phone, address: addr });
  } else {
    const existing = doneesByKey.get(key);
    if (!existing.email) existing.email = email;
    if (!existing.phone) existing.phone = phone;
    if (!existing.address) existing.address = addr;
  }
}

// Dedupe funds
const fundNames = new Set();
for (const r of rows) fundNames.add(nullify(r.txn_desc) ?? "General");

function mapType(source) {
  return (source ?? "").toUpperCase() === "CHECKS" ? "check" : "online";
}

// Build placeholders like ($1,$2,$3),($4,$5,$6),...
function buildPlaceholders(rowCount, cols) {
  const parts = [];
  for (let i = 0; i < rowCount; i++) {
    const start = i * cols + 1;
    const ph = [];
    for (let j = 0; j < cols; j++) ph.push(`$${start + j}`);
    parts.push(`(${ph.join(",")})`);
  }
  return parts.join(",");
}

const client = new Client({ connectionString: CONNECTION_STRING });

async function main() {
  await client.connect();
  console.log("Connected");

  // Wipe old imported state (keep users, keep the single seeded 'General' fund if present)
  console.log("Truncating donations, donees, funds (cascade)...");
  await client.query("TRUNCATE public.donations, public.donees, public.funds CASCADE");

  // Admin user
  const adminRes = await client.query(
    `INSERT INTO public.users (email, role, invited_at)
     VALUES ($1, 'admin', now())
     ON CONFLICT (email) DO UPDATE SET role='admin', removed_at=NULL
     RETURNING id`,
    [ADMIN_EMAIL],
  );
  const adminId = adminRes.rows[0].id;
  console.log(`Admin: ${adminId}`);

  // Funds (small, one-shot each is fine)
  const fundIdByName = new Map();
  for (const name of fundNames) {
    const { rows: fr } = await client.query(
      `INSERT INTO public.funds (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [name],
    );
    fundIdByName.set(name, fr[0].id);
  }
  console.log(`Funds: ${fundIdByName.size}`);

  // Donees — batch insert, keep ordering so we can map back to ids
  const doneeList = [...doneesByKey.values()];
  const doneeIdByKey = new Map();
  console.log(`Inserting ${doneeList.length} donees in chunks of ${CHUNK}...`);
  for (let i = 0; i < doneeList.length; i += CHUNK) {
    const chunk = doneeList.slice(i, i + CHUNK);
    const values = [];
    for (const d of chunk) values.push(d.name, d.email, d.phone, d.address, adminId);
    const sql =
      `INSERT INTO public.donees (name, email, phone, address, created_by)
       VALUES ${buildPlaceholders(chunk.length, 5)}
       RETURNING id`;
    const { rows: ir } = await client.query(sql, values);
    ir.forEach((row, idx) => doneeIdByKey.set(chunk[idx].key, row.id));
  }
  console.log(`Donees inserted: ${doneeIdByKey.size}`);

  // Donations — build all tuples, batch insert
  const donationTuples = [];
  let skipped = 0;
  const skipReasons = {};
  for (const r of rows) {
    const key = doneeKey(r);
    const doneeId = doneeIdByKey.get(key);
    if (!doneeId) { skipped++; skipReasons["no donee"] = (skipReasons["no donee"] || 0) + 1; continue; }
    const fundName = nullify(r.txn_desc) ?? "General";
    const fundId = fundIdByName.get(fundName);
    if (!fundId) { skipped++; skipReasons["no fund"] = (skipReasons["no fund"] || 0) + 1; continue; }
    const type = mapType(r.source);
    const amount = parseFloat(r.txn_amt);
    if (!Number.isFinite(amount) || amount <= 0) { skipped++; skipReasons["bad amount"] = (skipReasons["bad amount"] || 0) + 1; continue; }
    const dateStr = (nullify(r.txn_dt) ?? "").split(" ")[0];
    if (!dateStr) { skipped++; skipReasons["no date"] = (skipReasons["no date"] || 0) + 1; continue; }
    const reference_id = type === "online" ? `${r.source}-${r.txn_id}` : null;
    const check_number = type === "check" ? r.txn_id : null;
    const note = `Imported from ${r.source} txn ${r.txn_id}`;
    donationTuples.push([doneeId, fundId, type, amount, dateStr, check_number, reference_id, note, adminId]);
  }
  console.log(`Prepared ${donationTuples.length} donation tuples (skipped ${skipped})`);
  if (Object.keys(skipReasons).length) console.log("  skip reasons:", skipReasons);

  let inserted = 0;
  for (let i = 0; i < donationTuples.length; i += CHUNK) {
    const chunk = donationTuples.slice(i, i + CHUNK);
    const values = chunk.flat();
    const sql =
      `INSERT INTO public.donations
       (donee_id, fund_id, type, amount, date_received, check_number, reference_id, note, created_by)
       VALUES ${buildPlaceholders(chunk.length, 9)}`;
    try {
      await client.query(sql, values);
      inserted += chunk.length;
      if ((i / CHUNK) % 4 === 0) console.log(`  inserted ${inserted}/${donationTuples.length}`);
    } catch (err) {
      // Fall back to row-by-row for this chunk
      console.warn(`  chunk ${i}-${i + chunk.length} failed: ${err.message}. Falling back to row-by-row.`);
      for (const t of chunk) {
        try {
          await client.query(
            `INSERT INTO public.donations
             (donee_id, fund_id, type, amount, date_received, check_number, reference_id, note, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            t,
          );
          inserted++;
        } catch (e2) {
          skipped++;
          if (skipped < 10) console.warn(`    skip: ${e2.message}`);
        }
      }
    }
  }

  console.log(`DONE. Donations inserted=${inserted}, skipped=${skipped}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await client.end(); } catch {}
  process.exit(1);
});
