// scripts/apply-migrations.mjs
// Applies SQL migration files under supabase/migrations/ to the remote Supabase DB.
// Dev utility only. Uses the `pg` devDependency.
//
// Uses the Supabase pooler in session mode (port 5432) because the direct
// db.<ref>.supabase.co host has no IPv4 record and this machine lacks IPv6
// connectivity. Session mode is required for DDL/transactions.
//
// Usage:
//   SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres" \
//     node scripts/apply-migrations.mjs

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const CONNECTION_STRING = process.env.SUPABASE_DB_URL;
if (!CONNECTION_STRING) {
  console.error('SUPABASE_DB_URL env var is required.');
  console.error('Example: postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries
    .filter((name) => name.endsWith('.sql'))
    .sort(); // 0001_, 0002_, ... sort lexically in numeric order

  if (files.length === 0) {
    console.error('No migration files found in', MIGRATIONS_DIR);
    process.exit(1);
  }

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: trackedRows } = await client.query(
      'SELECT filename FROM public.schema_migrations',
    );
    const tracked = new Set(trackedRows.map((row) => row.filename));

    if (tracked.size === 0) {
      const { rows: existingSchema } = await client.query(
        "SELECT to_regclass('public.organizations') AS organizations",
      );
      if (existingSchema[0]?.organizations) {
        if (process.env.BASELINE_EXISTING !== '1') {
          throw new Error(
            'Existing schema has no migration history. Re-run with BASELINE_EXISTING=1 only after confirming the DB already has the listed migrations.',
          );
        }
        for (const file of files) {
          await client.query(
            'INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [file],
          );
          tracked.add(file);
        }
        console.log('Existing schema detected; baselined current migration files.');
      }
    }

    for (const file of files) {
      if (tracked.has(file)) {
        console.log(`Skipping ${file} ... already applied`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log('OK');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log('FAILED');
        console.error(`Error in ${file}:`, err.message);
        process.exit(1);
      }
    }
    console.log('\nAll migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
