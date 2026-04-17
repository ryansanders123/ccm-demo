import { describe, it, expect } from "vitest";
import { runCallbackGate } from "@/lib/auth-callback";

function mockSvc(state: { users: any[] }) {
  const svc: any = {
    from: (t: string) => ({
      select: (_a?: any, o?: any) => {
        if (o?.head && o?.count) return { count: state.users.length };
        return {
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({
              data: state.users.find(u => u.email === v) ?? null,
            }),
          }),
        };
      },
      insert: async (row: any) => { state.users.push({ ...row, id: "new" }); return { data: null, error: null }; },
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
