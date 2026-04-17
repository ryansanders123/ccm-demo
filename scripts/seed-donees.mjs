#!/usr/bin/env node
/**
 * Seed 10,000 synthetic donees so we can run the autocomplete perf test.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-donees.mjs           # insert
 *   node --env-file=.env.local scripts/seed-donees.mjs --cleanup # delete them
 *
 * All rows inserted here are tagged by appending " #perfseed" to the name so
 * cleanup can find and remove them without touching real donees.
 *
 * Implemented in plain ESM (.mjs) instead of .ts so we can avoid adding a
 * `tsx` dependency just for a one-off script.
 */
import { createClient } from "@supabase/supabase-js";

const TAG = "#perfseed";

const FIRSTS = [
  "John", "Mary", "Robert", "Patricia", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Jennifer",
  "Joseph", "Susan", "Thomas", "Jessica",
];
const LASTS = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
  "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
  "Gonzalez", "Wilson", "Anderson", "Thomas",
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}. Run with: node --env-file=.env.local scripts/seed-donees.mjs`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const cleanup = process.argv.includes("--cleanup");
  if (cleanup) {
    console.log(`Deleting donees tagged "${TAG}" ...`);
    const { error, count } = await sb
      .from("donees")
      .delete({ count: "exact" })
      .like("name", `%${TAG}%`);
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`Deleted ${count ?? "?"} perf-seed rows.`);
    return;
  }

  const rows = [];
  for (let i = 0; i < 10000; i++) {
    const f = FIRSTS[Math.floor(Math.random() * FIRSTS.length)];
    const l = LASTS[Math.floor(Math.random() * LASTS.length)];
    rows.push({ name: `${f} ${l} ${i} ${TAG}` });
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await sb.from("donees").insert(batch);
    if (error) {
      console.error(error);
      process.exit(1);
    }
    inserted += batch.length;
    if (inserted % 2500 === 0) {
      console.log(`  ${inserted} / ${rows.length}`);
    }
  }
  console.log(`Seeded ${inserted} donees (tagged "${TAG}").`);
  console.log("Run with --cleanup to remove them after perf tests.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
