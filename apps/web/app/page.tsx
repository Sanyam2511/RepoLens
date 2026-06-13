"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import IntelligenceLayer from "../components/IntelligenceLayer";
import Footer from "../components/Footer";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RepoLensDashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const router = useRouter();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      router.push(`/analyze?repoUrl=${encodeURIComponent(repoUrl)}`);
    } else {
      router.push("/analyze");
    }
  };

  return (
    <div className="min-h-screen page-shell">
      <Header />

      <main>
        <Hero />
        <Features />
        <IntelligenceLayer />

        {/* CTA Section instead of Analyzer */}
        <section className="content-grid mb-4 relative z-20">
          <div className="surface-card relative overflow-hidden rounded-3xl p-8 md:p-12 border-[var(--color-border-strong)]">
            {/* Background embellishments */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[var(--color-bg-subtle)] to-[var(--color-bg-surface)] opacity-80" />
            <div className="pointer-events-none absolute -right-20 -top-20 z-0 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 z-0 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-3xl" />

            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                Try it now
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Ready to see your codebase from a new angle?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--color-text-secondary)]">
                Paste any public GitHub repository URL below, and RepoLens will immediately map its architecture and import boundaries.
              </p>

              <form onSubmit={handleAnalyze} className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3 sm:flex-row">
                <div className="relative w-full flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                  </div>
                  <input
                    type="text"
                    placeholder="https://github.com/expressjs/express"
                    className="input-field w-full py-4 !pl-12 pr-4 shadow-sm"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-4 sm:w-auto shrink-0 shadow-sm">
                  Start Analysis <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              
              <div className="mt-6 text-sm text-[var(--color-text-tertiary)] flex justify-center gap-4">
                <span>✓ No installation required</span>
                <span className="hidden sm:inline">✓ Works with any public repo</span>
                <span className="hidden sm:inline">✓ Instant visual graph</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
