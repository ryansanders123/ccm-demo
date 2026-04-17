"use client";

import { Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";
const LOGO = process.env.NEXT_PUBLIC_ORG_LOGO_URL ?? "/logo.png";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");

  async function signIn(provider: "google" | "azure") {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const errMsg =
    error === "unverified" ? "Your provider didn't confirm your email address."
    : error === "not-invited" ? "This email isn't on the invite list. Ask an admin to invite you."
    : error === "removed"     ? "Your access has been revoked. Contact an admin."
    : error                   ? "Sign-in error. Please try again."
    : null;

  return (
    <main className="w-full max-w-sm p-8 bg-white rounded-lg shadow-lg border-t-4 border-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt={ORG} className="h-16 w-auto mx-auto mb-4" />
      <h1 className="text-xl font-serif text-center mb-6 text-brand">{ORG}</h1>
      {errMsg && <div className="mb-4 p-3 bg-red-50 text-red-800 rounded text-sm">{errMsg}</div>}
      <div className="space-y-3">
        <button onClick={() => signIn("google")}    className="w-full py-2 px-4 border border-brand rounded text-brand hover:bg-brand hover:text-white transition-colors">Sign in with Google</button>
        <button onClick={() => signIn("azure")}     className="w-full py-2 px-4 border border-brand rounded text-brand hover:bg-brand hover:text-white transition-colors">Sign in with Microsoft</button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
