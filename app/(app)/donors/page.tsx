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
        <h1 className="page-title">Donors</h1>
        <p className="page-subtitle">
          Browse all donors and review their giving history. Voided gifts are excluded from totals.
        </p>
      </header>
      <DonorListClient donors={donors} />
    </div>
  );
}
