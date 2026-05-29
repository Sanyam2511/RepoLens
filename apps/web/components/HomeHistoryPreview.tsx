"use client";

import React from "react";
import HistoryTimeline from "./HistoryTimeline";

export default function HomeHistoryPreview() {
  return (
    <section className="mx-auto w-[min(1200px,94vw)] mt-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div>
          <HistoryTimeline />
        </div>
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="text-sm font-semibold text-slate-900">Recent insights</div>
            <div className="mt-3 text-sm text-slate-600">See what changed between scans and jump into detailed diffs.</div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Improvement detected</div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">New feature added</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
