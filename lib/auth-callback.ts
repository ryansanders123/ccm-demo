import type { SupabaseClient } from "@supabase/supabase-js";

export type GateResult =
  | { kind: "redirect"; to: string }
  | { kind: "ok" };

type MinimalAuthUser = { id: string; email: string; email_verified: boolean };

export async function runCallbackGate(
  authUser: MinimalAuthUser,
  svc: SupabaseClient,
): Promise<GateResult> {
  if (!authUser.email_verified) {
    return { kind: "redirect", to: "/login?error=unverified" };
  }

  const { data: existing } = await svc
    .from("users")
    .select("*")
    .eq("email", authUser.email.toLowerCase())
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    if (existing.removed_at) {
      return { kind: "redirect", to: "/login?error=removed" };
    }
    if (existing.auth_user_id && existing.auth_user_id !== authUser.id) {
      return { kind: "redirect", to: "/login?error=identity-mismatch" };
    }
    const patch: Record<string, string> = { last_login_at: now };
    if (!existing.auth_user_id) {
      patch.auth_user_id = authUser.id;
      patch.first_login_at = now;
    }
    await svc.from("users").update(patch).eq("id", existing.id);
    return { kind: "ok" };
  }

  try { await svc.rpc("pg_advisory_xact_lock", { key: 1 }); } catch { /* best-effort */ }

  const { count } = await svc
    .from("users")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) === 0) {
    const { data: org } = await svc
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!org?.id) {
      return { kind: "redirect", to: "/login?error=no-organization" };
    }

    const { data: inserted } = await svc.from("users").insert({
      auth_user_id: authUser.id,
      email: authUser.email.toLowerCase(),
      role: "admin",
      platform_admin: true,
      organization_id: org.id,
      invited_at: now,
      first_login_at: now,
      last_login_at: now,
    }).select("id").single();

    if (inserted?.id) {
      await svc.from("user_organizations").upsert(
        {
          user_id: inserted.id,
          organization_id: org.id,
          role: "admin",
        },
        { onConflict: "user_id,organization_id" },
      );
    }
    return { kind: "ok" };
  }

  return { kind: "redirect", to: "/login?error=not-invited" };
}
