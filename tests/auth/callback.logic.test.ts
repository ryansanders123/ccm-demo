import { describe, it, expect } from "vitest";
import { runCallbackGate } from "@/lib/auth-callback";

function mockSvc(state: { users: any[] }) {
  const svc: any = {
    from: (t: string) => ({
      select: (_a?: any, o?: any) => {
        if (o?.head && o?.count) return { count: state.users.length };
        if (t === "organizations") {
          return {
            order: () => ({
              limit: () => ({
                single: async () => ({ data: { id: "org-1" }, error: null }),
              }),
            }),
          };
        }
        return {
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({
              data: state.users.find(u => u.email === v) ?? null,
            }),
          }),
        };
      },
      insert: (row: any) => {
        if (t === "user_organizations") {
          return { data: null, error: null };
        }
        state.users.push({ ...row, id: "new" });
        return {
          data: null,
          error: null,
          select: () => ({
            single: async () => ({ data: { id: "new" }, error: null }),
          }),
        };
      },
      upsert: async () => ({ data: null, error: null }),
      update: (patch: any) => ({
        eq: async (_c: string, id: string) => {
          const u = state.users.find(u => u.id === id);
          if (u) Object.assign(u, patch);
          return { data: null, error: null };
        },
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
  return svc;
}

describe("runCallbackGate", () => {
  it("rejects unverified email", async () => {
    const svc = mockSvc({ users: [] as any[] });
    const r = await runCallbackGate({ id: "a", email: "x@y.com", email_verified: false }, svc);
    expect(r).toEqual({ kind: "redirect", to: "/login?error=unverified" });
  });

  it("bootstraps admin on empty DB", async () => {
    const state: { users: any[] } = { users: [] };
    const svc = mockSvc(state);
    const r = await runCallbackGate({ id: "a", email: "x@y.com", email_verified: true }, svc);
    expect(r).toEqual({ kind: "ok" });
    expect(state.users[0].role).toBe("admin");
    expect(state.users[0].platform_admin).toBe(true);
    expect(state.users[0].organization_id).toBe("org-1");
    expect(state.users[0].auth_user_id).toBe("a");
  });

  it("rejects unknown email on non-empty DB", async () => {
    const state: { users: any[] } = { users: [{ id: "u1", email: "other@y.com", auth_user_id: "u1", role: "admin", removed_at: null }] };
    const svc = mockSvc(state);
    const r = await runCallbackGate({ id: "a", email: "x@y.com", email_verified: true }, svc);
    expect(r).toEqual({ kind: "redirect", to: "/login?error=not-invited" });
  });

  it("stamps auth_user_id on first login for invited user", async () => {
    const state: { users: any[] } = { users: [{ id: "u1", email: "x@y.com", auth_user_id: null, role: "user", removed_at: null }] };
    const svc = mockSvc(state);
    const r = await runCallbackGate({ id: "a", email: "x@y.com", email_verified: true }, svc);
    expect(r).toEqual({ kind: "ok" });
    expect(state.users[0].auth_user_id).toBe("a");
    expect(state.users[0].first_login_at).toBeTruthy();
  });

  it("rejects removed user", async () => {
    const state: { users: any[] } = { users: [{ id: "u1", email: "x@y.com", auth_user_id: "a", role: "user", removed_at: "2026-01-01" }] };
    const svc = mockSvc(state);
    const r = await runCallbackGate({ id: "a", email: "x@y.com", email_verified: true }, svc);
    expect(r).toEqual({ kind: "redirect", to: "/login?error=removed" });
  });
});
