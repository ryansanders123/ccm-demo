"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/auth";

// Switch the calling user's active org. The new org must be one the
// user has a public.user_organizations row for. Updates
// users.organization_id (the field current_org_id() reads) AND
// users.role (so the active org's role is what is_admin() sees).
export async function switchActiveOrg(slug: string): Promise<void> {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  // Resolve target org by slug AND verify membership in one query.
  const { data: target, error: tErr } = await supabase
    .from("user_organizations")
    .select("organization_id, role, organizations!inner(id, slug)")
    .eq("organizations.slug", slug)
    .maybeSingle();
  if (tErr) throw new Error(`switchActiveOrg: ${tErr.message}`);
  if (!target) throw new Error(`Not a member of "${slug}"`);

  const newOrgId = target.organization_id as string;
  const newRole = ((target.role as string) ?? "user").toLowerCase();
  // Map junction roles ("admin"/"member") to users.role enum ("admin"/"user").
  const mappedRole = newRole === "admin" ? "admin" : "user";

  const { error: uErr } = await supabase
    .from("users")
    .update({ organization_id: newOrgId, role: mappedRole })
    .eq("id", user.id);
  if (uErr) throw new Error(`switchActiveOrg: update users: ${uErr.message}`);

  revalidatePath("/", "layout");
}

// Pinnacle/super-admin actions for managing organizations and members.
// Currently gated by users.role='admin' (a CCMC admin can add orgs).
// A more granular "platform admin" role can be added later.

export async function createOrganization(input: {
  slug: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  support_email?: string;
  mailing_address?: string;
  tax_statement_text?: string;
}): Promise<{ id: string }> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const slug = input.slug.toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error("slug must be lowercase letters/digits/hyphens, starting with alphanumeric");
  }
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      slug,
      name: input.name.trim(),
      logo_url: input.logo_url ?? null,
      primary_color: input.primary_color ?? null,
      support_email: input.support_email ?? null,
      mailing_address: input.mailing_address ?? null,
      tax_statement_text: input.tax_statement_text ?? null,
      features: {
        campaigns: true,
        appeals: true,
        tax_summary: true,
        import: true,
        exports: true,
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(`createOrganization: ${error.message}`);
  revalidatePath("/admin/organizations");
  return { id: data.id };
}

export async function updateOrganizationBranding(input: {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  support_email: string | null;
  mailing_address: string | null;
  tax_statement_text: string | null;
}): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: input.name.trim(),
      logo_url: input.logo_url,
      primary_color: input.primary_color,
      support_email: input.support_email,
      mailing_address: input.mailing_address,
      tax_statement_text: input.tax_statement_text,
    })
    .eq("id", input.id);
  if (error) throw new Error(`updateOrganizationBranding: ${error.message}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/", "layout");
}

export async function updateOrganizationFeatures(input: {
  id: string;
  features: Record<string, boolean>;
}): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("organizations")
    .update({ features: input.features })
    .eq("id", input.id);
  if (error) throw new Error(`updateOrganizationFeatures: ${error.message}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/", "layout");
}

// Add a user to an org by email (must already exist in public.users).
// Sets the role in user_organizations.
export async function addUserToOrg(input: {
  email: string;
  orgId: string;
  role?: "admin" | "member";
}): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const email = input.email.toLowerCase().trim();
  const role = input.role ?? "member";

  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (uErr) throw new Error(`addUserToOrg: lookup user: ${uErr.message}`);
  if (!user) throw new Error(`No user with email "${email}". Invite them first.`);

  const { error: iErr } = await supabase
    .from("user_organizations")
    .upsert(
      { user_id: user.id, organization_id: input.orgId, role },
      { onConflict: "user_id,organization_id" },
    );
  if (iErr) throw new Error(`addUserToOrg: ${iErr.message}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
}

export async function removeUserFromOrg(input: {
  userId: string;
  orgId: string;
}): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("user_organizations")
    .delete()
    .eq("user_id", input.userId)
    .eq("organization_id", input.orgId);
  if (error) throw new Error(`removeUserFromOrg: ${error.message}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
}

// Onboarding: create a new org AND seat its first admin (invite + add
// to user_organizations) in one shot. The first admin must already
// exist as a public.users row OR will be invited and then added.
export async function onboardOrganization(input: {
  slug: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  adminEmail: string;
}): Promise<{ orgId: string }> {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const { id: orgId } = await createOrganization({
    slug: input.slug,
    name: input.name,
    logo_url: input.logo_url,
    primary_color: input.primary_color,
  });

  const email = input.adminEmail.toLowerCase().trim();

  // Ensure the admin exists in public.users. If not, invite them (as a
  // platform-level user with role='user' — their per-org role is admin).
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existing) {
    const inviter = await requireAdmin();
    const { error: iErr } = await supabase.from("users").insert({
      email,
      role: "user",
      invited_by: inviter.id,
      organization_id: orgId,
    });
    if (iErr) throw new Error(`onboardOrganization: invite admin: ${iErr.message}`);
  }

  await addUserToOrg({ email, orgId, role: "admin" });
  return { orgId };
}
