import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Phase 5.2 — autocomplete performance benchmark.
 *
 * We measure the same prefix-ilike query the `searchDonees` server action
 * issues (see `app/(app)/donations/actions.ts`). We hit the Supabase REST
 * endpoint directly with the service role key because:
 *   1. OAuth isn't wired up in this environment yet, so we can't execute
 *      the server action under a real user session in an automated way.
 *   2. The DB index (donees_name_trgm_idx + donees_name_lower_idx) is what
 *      actually governs p95 — the server action adds negligible overhead on
 *      top of the round-trip.
 *
 * Preconditions for a meaningful run:
 *   - `SUPABASE_SERVICE_ROLE_KEY` is set (load .env.local: vitest picks it
 *     up via `vitest --env-file=.env.local`, or run with
 *     `node --env-file=.env.local node_modules/vitest/vitest.mjs`).
 *   - The donees table has been seeded with ~10k rows via
 *     `node --env-file=.env.local scripts/seed-donees.mjs`.
 *
 * When the service role key is not present, the suite is skipped rather than
 * failing so routine `npm test` runs don't need live DB access.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!supabaseUrl || !serviceRoleKey)(
  "donee autocomplete perf",
  () => {
    it(
      "p95 under 300ms for prefix query against donees table",
      async () => {
        const sb = createClient(supabaseUrl!, serviceRoleKey!, {
          auth: { persistSession: false },
        });

        // Warm up — first hit usually pays a connection / plan-cache cost.
        await sb.from("donees").select("id,name").ilike("name", "Jo%").limit(10);

        const samples: number[] = [];
        const prefixes = ["Jo", "Ma", "Ri", "Da", "Wi", "El", "Ba", "Su", "Je", "Th"];
        for (let i = 0; i < 20; i++) {
          const prefix = prefixes[i % prefixes.length];
          const t0 = performance.now();
          const { error } = await sb
            .from("donees")
            .select("id,name")
            .ilike("name", `${prefix}%`)
            .limit(10);
          const elapsed = performance.now() - t0;
          if (error) throw new Error(error.message);
          samples.push(elapsed);
        }

        samples.sort((a, b) => a - b);
        const p50 = samples[Math.floor(samples.length * 0.5) - 1];
        const p95 = samples[Math.floor(samples.length * 0.95) - 1];
        // eslint-disable-next-line no-console
        console.log(
          `donee autocomplete: n=${samples.length} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms min=${samples[0].toFixed(1)}ms max=${samples[samples.length - 1].toFixed(1)}ms`
        );
        expect(p95).toBeLessThan(300);
      },
      30_000
    );
  }
);
