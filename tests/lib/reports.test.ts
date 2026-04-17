import { describe, it, expect } from "vitest";
import { summarize } from "@/lib/reports";

const rows = [
  { id: "1", type: "cash",   amount: "10.00", fund_name: "General",  voided_at: null },
  { id: "2", type: "check",  amount: "20.00", fund_name: "General",  voided_at: null },
  { id: "3", type: "online", amount: "30.00", fund_name: "Building", voided_at: null },
  { id: "4", type: "cash",   amount: "40.00", fund_name: "Building", voided_at: "2026-04-16" }, // voided
];

describe("summarize", () => {
  it("totals by type excluding voided", () => {
    const s = summarize(rows as any);
    expect(s.byType).toEqual({ cash: 10, check: 20, online: 30 });
    expect(s.byFund).toEqual({ General: 30, Building: 30 });
    expect(s.grand).toBe(60);
  });
});
