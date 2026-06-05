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
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      <div className="content-grid py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <nav className="hidden lg:flex items-center gap-6 micro-label text-[var(--color-text-secondary)]">
            <Link href="/#analyze" className="hover:text-[var(--color-text-primary)] transition-colors">Analyze</Link>
            <Link href="/how-it-works" className="hover:text-[var(--color-text-primary)] transition-colors">How it works</Link>
            <a href="/history" className="hover:text-[var(--color-text-primary)] transition-colors">History</a>
          </nav>

          <div className="flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <BrandMark />
              <span className="text-xl font-semibold">RepoLens</span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-3">
            {authUser ? (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="micro-label">Signed in</span>
                  <span className="ui-label font-semibold text-[var(--color-text-primary)]">{authUser.name}</span>
                </div>
                <button type="button" onClick={clearAuthSession} className="btn-secondary text-xs uppercase tracking-[0.12em] px-4 py-2">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-xs uppercase tracking-[0.12em] px-4 py-2">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary text-xs uppercase tracking-[0.12em] px-4 py-2">
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
