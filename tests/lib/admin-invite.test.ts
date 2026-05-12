import { describe, it, expect, vi, beforeEach } from "vitest";

const usersMaybeSingleSpy = vi.fn().mockResolvedValue({ data: null, error: null });
const usersInsertSingleSpy = vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null });
const usersInsertSpy = vi.fn(() => ({
  select: vi.fn(() => ({ single: usersInsertSingleSpy })),
}));
const membershipUpsertSpy = vi.fn().mockResolvedValue({ error: null });
const fromSpy = vi.fn((table: string) => {
  if (table === "users") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: usersMaybeSingleSpy })),
      })),
      insert: usersInsertSpy,
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    };
  }
  if (table === "user_organizations") {
    return { upsert: membershipUpsertSpy };
  }
  return {};
});

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: fromSpy }),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: "admin-1",
    auth_user_id: "auth-1",
    email: "admin@example.com",
    role: "admin",
    platform_admin: false,
    organization_id: "org-ccmc-uuid",
    invited_at: "2026-01-01T00:00:00Z",
    invited_by: null,
    first_login_at: null,
    last_login_at: null,
    removed_at: null,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { inviteUser } from "@/app/(app)/admin/actions";

describe("inviteUser", () => {
  beforeEach(() => {
    usersMaybeSingleSpy.mockClear();
    usersMaybeSingleSpy.mockResolvedValue({ data: null, error: null });
    usersInsertSpy.mockClear();
    usersInsertSingleSpy.mockClear();
    usersInsertSingleSpy.mockResolvedValue({ data: { id: "user-1" }, error: null });
    membershipUpsertSpy.mockClear();
    membershipUpsertSpy.mockResolvedValue({ error: null });
    fromSpy.mockClear();
  });

  it("scopes the invited user to the inviting admin's organization", async () => {
    await inviteUser({ email: "New@Example.com" });

    expect(usersInsertSpy).toHaveBeenCalledTimes(1);
    expect(usersInsertSpy).toHaveBeenCalledWith({
      email: "new@example.com",
      role: "user",
      invited_by: "admin-1",
      organization_id: "org-ccmc-uuid",
    });
    expect(membershipUpsertSpy).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        organization_id: "org-ccmc-uuid",
        role: "member",
      },
      { onConflict: "user_id,organization_id" },
    );
  });

  it("propagates supabase insert errors", async () => {
    usersInsertSingleSpy.mockResolvedValueOnce({ data: null, error: { message: "duplicate email" } });
    await expect(inviteUser({ email: "dup@example.com" })).rejects.toThrow(
      "duplicate email",
    );
  });
});
