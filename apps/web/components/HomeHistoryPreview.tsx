"use client";

import React from "react";
import HistoryTimeline from "./HistoryTimeline";

export default function HomeHistoryPreview() {
  return (
    <section className="content-grid py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div>
          <HistoryTimeline />
        </div>
        <div>
          <div className="compact-card p-4">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Recent insights</div>
            <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
              See what changed between scans and jump into detailed diffs.
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="badge-chip badge-healthy px-3 py-2 text-sm normal-case tracking-normal">Improvement detected</div>
              <div className="badge-chip badge-accent px-3 py-2 text-sm normal-case tracking-normal">New module added</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
