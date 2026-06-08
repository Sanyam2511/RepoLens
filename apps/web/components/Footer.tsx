"use client";

import Link from "next/link";
import React from "react";
import BrandMark from "./BrandMark";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] dot-grid-bg">
      <div className="content-grid py-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <BrandMark className="h-9 w-9" />
              <div>
                <div className="text-xl font-semibold text-[var(--color-text-primary)]">RepoLens</div>
                <div className="data-mono-dense text-[var(--color-text-tertiary)]">repository intelligence layer</div>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Visualize repository architecture, share insights, and keep a searchable history of every scan.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/#analyze" className="btn-primary text-xs uppercase tracking-[0.12em]">
                Start analysis
              </Link>
              <Link href="/history" className="btn-secondary text-xs uppercase tracking-[0.12em]">
                View history
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="micro-label">Product</div>
              <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li>
                  <Link href="/how-it-works" className="transition-colors hover:text-[var(--color-text-primary)]">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/history" className="transition-colors hover:text-[var(--color-text-primary)]">
                    History
                  </Link>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="micro-label">Resources</div>
              <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li>
                  <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                    Docs
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-5 text-xs text-[var(--color-text-tertiary)] md:flex-row md:items-center md:justify-between">
          <span>&copy; {new Date().getFullYear()} RepoLens - Built for exploring repository structure.</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
