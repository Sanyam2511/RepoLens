"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setAuthSession } from "../../../lib/auth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthSession({ token, user });
        // Successfully logged in, go to analyze
        router.push("/analyze");
      } catch (error) {
        console.error("Failed to parse user data from callback", error);
        router.push("/login?error=invalid_callback");
      }
    } else {
      router.push("/login?error=missing_callback_data");
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg-base)]">
      <Loader2 className="w-10 h-10 animate-spin text-[var(--color-accent)] mb-4" />
      <p className="text-[var(--color-text-secondary)] font-medium">Completing sign in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg-base)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-accent)] mb-4" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
