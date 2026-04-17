// scripts/verify-migrations.mjs
// Verifies migration results. Dev utility only.
// Usage: SUPABASE_DB_URL="postgresql://..." node scripts/verify-migrations.mjs
import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.SUPABASE_DB_URL;
if (!CONNECTION_STRING) {
  console.error('SUPABASE_DB_URL env var is required.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  try {
    const tables = await client.query(
      `SELECT table_name, table_type FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name;`
    );
    console.log('Public tables/views:');
    for (const r of tables.rows) console.log('  -', r.table_name, `(${r.table_type})`);

    const donees = await client.query('SELECT count(*)::int AS n FROM public.donees');
    console.log('donees count:', donees.rows[0].n);

    const funds = await client.query('SELECT count(*)::int AS n FROM public.funds');
    console.log('funds count:', funds.rows[0].n);

    const exts = await client.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('citext','pg_trgm') ORDER BY extname;`
    );
    console.log('Extensions:');
    for (const r of exts.rows) console.log('  -', r.extname);
  } finally {
    await client.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
