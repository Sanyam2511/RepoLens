"use client";

import Link from "next/link";
import { GitBranch, History, Search } from "lucide-react";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, type StoredAuthSession } from "../lib/auth";

const navItems = [
  { href: "/analyze", label: "Analyze", icon: Search },
  { href: "/how-it-works", label: "How it works", icon: GitBranch },
  { href: "/history", label: "History", icon: History },
];

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
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="content-grid px-0">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/90 shadow-[0_10px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-accent-subtle)] to-transparent" aria-hidden />
          <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 text-[var(--color-text-primary)]">
              <BrandMark className="h-8 w-8" />
              <span className="hidden text-lg font-semibold sm:inline">RepoLens</span>
            </Link>

            <nav className="hidden justify-center lg:flex">
              <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                ))}
              </div>
            </nav>

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
                  <Link href="/login" className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] sm:inline-flex">
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
      </div>
    </header>
  );
}
