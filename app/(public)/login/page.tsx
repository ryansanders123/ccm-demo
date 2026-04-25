"use client";

import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";
const LOGO = process.env.NEXT_PUBLIC_ORG_LOGO_URL ?? "/logo.png";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicState, setMagicState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);

  async function signIn(provider: "google") {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setMagicState("sending");
    setMagicError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      setMagicState("error");
      setMagicError(error.message);
    } else {
      setMagicState("sent");
    }
  }

  const errMsg =
    error === "unverified"
      ? "Your provider didn't confirm your email address."
      : error === "not-invited"
      ? "This email isn't on the invite list. Ask an admin to invite you."
      : error === "removed"
      ? "Your access has been revoked. Contact an admin."
      : error
      ? "Sign-in error. Please try again."
      : null;

  return (
    <main className="w-full max-w-md animate-fade-in">
      <div className="relative">
        {/* Decorative gradient ring */}
        <div
          aria-hidden
          className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-brand-200/50 via-stone-200/40 to-stone-200/20 pointer-events-none"
        />
        <div className="relative bg-white rounded-3xl shadow-pop border border-stone-200/70 p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt={ORG} className="h-20 w-auto mb-5" />
            <h1 className="font-serif text-2xl md:text-[28px] leading-tight text-stone-900 tracking-tight">
              {ORG}
            </h1>
            <p className="text-sm text-stone-500 mt-2">
              Sign in to access the donation portal.
            </p>
          </div>

          {errMsg && (
            <div
              role="alert"
              className="mb-5 p-3 bg-red-50 text-red-800 rounded-xl text-sm border border-red-200/70"
            >
              {errMsg}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={() => signIn("google")}
              className="btn btn-secondary w-full py-2.5 text-[15px]"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400">
            <span className="flex-1 h-px bg-stone-200" />
            or sign in with email
            <span className="flex-1 h-px bg-stone-200" />
          </div>

          {magicState === "sent" ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-sm text-emerald-800">
              Check <span className="font-medium">{magicEmail}</span> for a sign-in link.
              You can close this tab.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-2.5">
              <input
                type="email"
                required
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={magicState === "sending"}
                className="btn btn-primary w-full py-2.5 text-[15px] disabled:opacity-60"
              >
                {magicState === "sending" ? "Sending…" : "Send magic link"}
              </button>
              {magicError && (
                <div className="text-xs text-red-700">{magicError}</div>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-xs text-stone-400">
            Access is invite-only. Contact an administrator if you need to be added.
          </p>
        </div>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.568 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

