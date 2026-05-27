"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, type StoredAuthSession } from "../lib/auth";

export default function Header() {
  const [authUser, setAuthUser] = useState<StoredAuthSession["user"] | null>(getStoredAuthUser());

  useEffect(() => {
    const syncAuth = () => setAuthUser(getStoredAuthUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-sm">
      <div className="mx-auto w-[min(1200px,94vw)] py-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            <Link href="/#analyze" className="hover:text-slate-900">Analyze</Link>
            <Link href="/how-it-works" className="hover:text-slate-900">How it works</Link>
            <a href="/history" className="hover:text-slate-900">History</a>
          </nav>

          <div className="flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BrandMark />
              <span className="display-font text-xl">RepoLens</span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-3">
            {authUser ? (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signed in</span>
                  <span className="text-sm font-semibold text-slate-900">{authUser.name}</span>
                </div>
                <button
                  type="button"
                  onClick={clearAuthSession}
                  className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-white">
                  Login
                </Link>
                <Link href="/signup" className="brand-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
