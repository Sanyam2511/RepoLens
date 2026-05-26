"use client";

import Link from "next/link";
import React from "react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-sm">
      <div className="mx-auto w-[min(1200px,94vw)] py-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            <a href="#analyze" className="hover:text-slate-900">Analyze</a>
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
            <a href="/history" className="hover:text-slate-900">History</a>
          </nav>

          <div className="flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">RL</span>
              <span className="display-font text-xl">RepoLens</span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link href="/login" className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-white">
              Login
            </Link>
            <Link href="/signup" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow hover:bg-slate-800">
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
