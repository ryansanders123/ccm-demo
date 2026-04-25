"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
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

  const fundId = parsed.fund_id && parsed.fund_id !== "" ? parsed.fund_id : null;
  const campaignId = parsed.campaign_id && parsed.campaign_id !== "" ? parsed.campaign_id : null;
  const appealId = parsed.appeal_id && parsed.appeal_id !== "" ? parsed.appeal_id : null;

  if (fundId) {
    const { data: fund, error: fErr } = await supabase
      .from("funds").select("id, archived_at").eq("id", fundId).single();
    if (fErr || !fund) throw new Error("Fund not found");
    if (fund.archived_at) throw new Error("Fund is archived");
  }
  if (campaignId) {
    const { data: c, error: cErr } = await supabase
      .from("campaigns").select("id, archived_at").eq("id", campaignId).single();
    if (cErr || !c) throw new Error("Campaign not found");
    if (c.archived_at) throw new Error("Campaign is archived");
  }
  if (appealId) {
    const { data: a, error: aErr } = await supabase
      .from("appeals").select("id, archived_at").eq("id", appealId).single();
    if (aErr || !a) throw new Error("Appeal not found");
    if (a.archived_at) throw new Error("Appeal is archived");
  }

  const { error } = await supabase.from("donations").insert({
    donee_id: parsed.donee_id,
    fund_id: fundId,
    campaign_id: campaignId,
    appeal_id: appealId,
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
  const user = await requireAdmin();
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
