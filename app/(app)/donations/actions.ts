"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { doneeInputSchema, donationInputSchema, voidInputSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function searchDonees(q: string) {
  await requireUser();
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const safe = trimmed.replace(/[%_]/g, (m) => `\\${m}`); // escape LIKE wildcards
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("donees")
    .select("id,name,email,phone")
    .or(`name.ilike.%${safe}%,name.wfts.${safe}`)  // ilike OR similarity fallback
    .order("name", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDonee(input: unknown) {
  const user = await requireUser();
  const parsed = doneeInputSchema.parse(input);
  const supabase = createSupabaseServerClient();
  const payload = {
    name: parsed.name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    address: parsed.address || null,
    created_by: user.id,
  };
  const { data, error } = await supabase.from("donees").insert(payload).select("id,name,email,phone").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addDonation(input: unknown) {
  const user = await requireUser();
  const parsed = donationInputSchema.parse(input);
  const supabase = createSupabaseServerClient();

  // Fund must not be archived at insert time.
  const { data: fund, error: fErr } = await supabase
    .from("funds").select("id, archived_at").eq("id", parsed.fund_id).single();
  if (fErr || !fund) throw new Error("Fund not found");
  if (fund.archived_at) throw new Error("Fund is archived");

  const { error } = await supabase.from("donations").insert({
    donee_id: parsed.donee_id,
    fund_id: parsed.fund_id,
    type: parsed.type,
    amount: parsed.amount,
    date_received: parsed.date_received,
    check_number: parsed.check_number ?? null,
    reference_id: parsed.reference_id ?? null,
    note: parsed.note ?? null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/report");
}

export async function voidDonation(input: unknown) {
  const user = await requireUser();
  const parsed = voidInputSchema.parse(input);
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("donations")
    .update({
      voided_at: new Date().toISOString(),
      voided_by: user.id,
      void_reason: parsed.reason,
    })
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);
  revalidatePath("/report");
}
