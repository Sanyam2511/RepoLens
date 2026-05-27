"use client";

import BrandMark from "./BrandMark";
import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="relative z-10 mx-auto w-[min(1200px,94vw)] mt-20 pb-16">
      <div className="rounded-[40px] border border-slate-200/70 bg-white p-10 shadow-[0_26px_60px_rgba(15,23,42,0.14)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="text-2xl text-slate-900 display-font">RepoLens</div>
            </div>
            <div className="mt-2 text-sm text-slate-600">Visualize repository architecture, share insights, and keep a searchable history of every scan.</div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/#analyze" className="brand-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">Start analysis</Link>
              <Link href="/history" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 hover:bg-slate-50">View history</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Product</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><Link href="/how-it-works" className="hover:text-slate-900">How it works</Link></li>
                <li><Link href="/history" className="hover:text-slate-900">History</Link></li>
                <li><a href="#" className="hover:text-slate-900">Integrations</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Resources</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Docs</a></li>
                <li><a href="#" className="hover:text-slate-900">API</a></li>
                <li><a href="#" className="hover:text-slate-900">GitHub</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200/70 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} RepoLens — Built for exploring repository structure.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-700">Privacy</a>
            <a href="#" className="hover:text-slate-700">Terms</a>
            <a href="#" className="hover:text-slate-700">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
