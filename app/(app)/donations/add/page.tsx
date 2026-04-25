import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DonationForm } from "@/components/DonationForm";

export default async function AddDonationPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: funds }, { data: campaigns }, { data: appeals }] = await Promise.all([
    supabase.from("funds").select("id,name").is("archived_at", null).order("name"),
    supabase.from("campaigns").select("id,name").is("archived_at", null).order("name"),
    supabase.from("appeals").select("id,name").is("archived_at", null).order("name"),
  ]);
  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 tracking-tight">
          Add donation
        </h1>
        <p className="mt-2 text-stone-600">
          Record a new contribution. Required fields are marked.
        </p>
      </header>
      <div className="card p-6 md:p-8">
        <DonationForm
          funds={funds ?? []}
          campaigns={campaigns ?? []}
          appeals={appeals ?? []}
        />
      </div>
    </div>
  );
}
