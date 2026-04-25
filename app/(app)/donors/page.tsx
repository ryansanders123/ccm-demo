import { requireUser } from "@/lib/auth";
import { getDonorList } from "@/lib/donors";
import { DonorListClient } from "@/components/DonorListClient";

export const dynamic = "force-dynamic";

export default async function DonorsPage() {
  await requireUser();
  const donors = await getDonorList();

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-900 tracking-tight">
          Donors
        </h1>
        <p className="mt-2 text-stone-600">
          Browse all donors and review their giving history. Voided gifts are excluded from totals.
        </p>
      </header>
      <DonorListClient donors={donors} />
    </div>
  );
}
