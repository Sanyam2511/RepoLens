"use client";

import BrandMark from "./BrandMark";
import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 footer-inverse">
      <div className="content-grid py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="text-2xl font-semibold">RepoLens</div>
            </div>
            <div className="mt-2 text-sm text-[var(--color-text-tertiary)]">
              Visualize repository architecture, share insights, and keep a searchable history of every scan.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/#analyze" className="btn-primary text-xs uppercase tracking-[0.12em]">
                Start analysis
              </Link>
              <Link href="/history" className="btn-secondary text-xs uppercase tracking-[0.12em] border-[var(--color-border-strong)] text-[var(--color-text-inverse)] hover:bg-white/10">
                View history
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="micro-label text-[var(--color-text-tertiary)]">Product</div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-tertiary)]">
                <li><Link href="/how-it-works" className="hover:text-[var(--color-text-inverse)] transition-colors">How it works</Link></li>
                <li><Link href="/history" className="hover:text-[var(--color-text-inverse)] transition-colors">History</Link></li>
                <li><a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <div className="micro-label text-[var(--color-text-tertiary)]">Resources</div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-tertiary)]">
                <li><a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">Docs</a></li>
                <li><a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">API</a></li>
                <li><a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-[var(--color-text-tertiary)] md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} RepoLens — Built for exploring repository structure.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--color-text-inverse)] transition-colors">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
