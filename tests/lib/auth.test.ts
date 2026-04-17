import { describe, it, expect, vi } from "vitest";
import { currentAppUser } from "@/lib/auth";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    rpc: vi.fn().mockResolvedValue({
      data: { id: "u1", email: "a@b.com", role: "admin", removed_at: null },
      error: null,
    }),
  }),
}));

describe("currentAppUser", () => {
  it("returns the current user when session is valid", async () => {
    const u = await currentAppUser();
    expect(u?.email).toBe("a@b.com");
    expect(u?.role).toBe("admin");
  });
});
