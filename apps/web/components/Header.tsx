"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, type StoredAuthSession } from "../lib/auth";

const navItems = [
  { href: "/analyze", label: "Analyze" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/history", label: "History" },
];

export default function Header() {
  const [authUser, setAuthUser] = useState<StoredAuthSession["user"] | null>(getStoredAuthUser());
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const syncAuth = () => setAuthUser(getStoredAuthUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-border-subtle)]">
      <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-[var(--color-text-primary)]">
            <BrandMark className="h-7 w-7" />
            <span className="text-[1.15rem] font-bold tracking-tight hidden sm:inline">RepoLens</span>
          </Link>

          <nav className="hidden lg:flex items-center h-full gap-8">
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center h-14 px-1 text-[15px] transition-colors hover:text-[var(--color-accent)] ${
                    isActive ? "text-[var(--color-accent)] font-bold" : "text-[var(--color-text-secondary)] font-medium"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--color-accent)] rounded-t-sm" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {authUser ? (
            <>
              <div className="hidden sm:flex flex-col items-end leading-none mr-2 justify-center">
                <span className="text-sm font-semibold text-[var(--color-text-primary)] mb-[2px]">{authUser.name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-tertiary)]">Signed in</span>
              </div>
              <button type="button" onClick={handleSignOut} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] rounded-lg hover:bg-slate-50 transition shadow-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[#232F72] transition">
                Login
              </Link>
              <Link href="/signup" className="px-5 py-2.5 text-sm font-semibold !text-white bg-[#232F72] hover:bg-[#1C255A] rounded-lg transition shadow-md">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
