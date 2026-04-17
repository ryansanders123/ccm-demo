import { describe, it, expect } from "vitest";
import { donationInputSchema } from "@/lib/validators";

describe("donationInputSchema", () => {
  const base = {
    donee_id: "00000000-0000-0000-0000-000000000001",
    fund_id:  "00000000-0000-0000-0000-000000000002",
    type: "cash" as const,
    amount: "10.00",
    date_received: "2026-04-16",
  };

  it("accepts a valid cash donation", () => {
    expect(donationInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects amount <= 0", () => {
    expect(donationInputSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(donationInputSchema.safeParse({ ...base, amount: "-1" }).success).toBe(false);
  });

  it("rejects amount with more than 2 decimals", () => {
    expect(donationInputSchema.safeParse({ ...base, amount: "10.001" }).success).toBe(false);
  });

  it("requires check_number when type is check", () => {
    expect(donationInputSchema.safeParse({ ...base, type: "check" }).success).toBe(false);
    expect(donationInputSchema.safeParse({ ...base, type: "check", check_number: "1234" }).success).toBe(true);
  });

  it("requires reference_id when type is online", () => {
    expect(donationInputSchema.safeParse({ ...base, type: "online" }).success).toBe(false);
    expect(donationInputSchema.safeParse({ ...base, type: "online", reference_id: "TX-1" }).success).toBe(true);
  });

  it("forbids check_number when type is cash", () => {
    expect(donationInputSchema.safeParse({ ...base, check_number: "1234" }).success).toBe(false);
  });
});
