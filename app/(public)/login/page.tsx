"use client";

import { Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";

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
    <main className="w-full max-w-sm p-8 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-serif text-center mb-6">{ORG}</h1>
      {errMsg && <div className="mb-4 p-3 bg-red-50 text-red-800 rounded text-sm">{errMsg}</div>}
      <div className="space-y-3">
        <button onClick={() => signIn("google")}    className="w-full py-2 px-4 border rounded hover:bg-stone-50">Sign in with Google</button>
        <button onClick={() => signIn("azure")}     className="w-full py-2 px-4 border rounded hover:bg-stone-50">Sign in with Microsoft</button>
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
