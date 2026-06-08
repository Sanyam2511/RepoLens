import Link from "next/link";
import { ArrowRight, GitBranch, Layers3, Search, ShieldCheck, Waypoints } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const steps = [
  {
    id: "01",
    title: "Paste a repository",
    description:
      "Drop in any public GitHub URL. RepoLens collects the project structure, parses the codebase, and prepares the scan for analysis.",
    icon: Search,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="step1Title step1Desc">
        <title id="step1Title">Repository URL input</title>
        <desc id="step1Desc">URL field with file tree nodes below</desc>
        <rect width="360" height="260" fill="#F8FAFC" />
        <rect x="34" y="38" width="292" height="44" rx="8" fill="#F1F5F9" stroke="#CBD5E1" />
        <circle cx="66" cy="60" r="8" fill="#6366F1" />
        <rect x="92" y="52" width="120" height="16" rx="4" fill="#E2E8F0" />
        <rect x="40" y="110" width="92" height="94" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
        <rect x="146" y="110" width="92" height="94" rx="8" fill="rgba(124,58,237,0.08)" stroke="#7C3AED" strokeWidth="1.5" />
        <rect x="252" y="110" width="68" height="94" rx="8" fill="rgba(8,145,178,0.08)" stroke="#0891B2" strokeWidth="1.5" />
        <path d="M86 126L84 172" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M192 126L192 172" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="86" cy="128" r="5" fill="#6366F1" />
        <circle cx="192" cy="128" r="5" fill="#7C3AED" />
        <circle cx="286" cy="128" r="5" fill="#0891B2" />
      </svg>
    ),
  },
  {
    id: "02",
    title: "Inspect the architecture",
    description:
      "The analyzer groups files, APIs, and storage into a graph. Use filters, zoom controls, and node previews to understand the system quickly.",
    icon: Waypoints,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="step2Title step2Desc">
        <title id="step2Title">Architecture graph</title>
        <desc id="step2Desc">Connected nodes with dependency edges</desc>
        <rect width="360" height="260" fill="#F8FAFC" />
        <rect x="22" y="24" width="130" height="98" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
        <rect x="208" y="24" width="130" height="72" rx="8" fill="rgba(124,58,237,0.08)" stroke="#7C3AED" strokeWidth="1.5" />
        <rect x="122" y="136" width="138" height="86" rx="8" fill="rgba(8,145,178,0.08)" stroke="#0891B2" strokeWidth="1.5" />
        <path d="M88 122L152 154" stroke="#CBD5E1" strokeWidth="2" />
        <path d="M244 96L192 146" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="86" cy="122" r="6" fill="#6366F1" />
        <circle cx="244" cy="96" r="6" fill="#7C3AED" />
        <circle cx="192" cy="154" r="6" fill="#0891B2" />
      </svg>
    ),
  },
  {
    id: "03",
    title: "Save and share results",
    description:
      "Every scan is saved to history so you can revisit it later, compare runs, and share the findings with your team.",
    icon: ShieldCheck,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="step3Title step3Desc">
        <title id="step3Title">Scan history</title>
        <desc id="step3Desc">Timeline of saved repository scans</desc>
        <rect width="360" height="260" fill="#F8FAFC" />
        <rect x="36" y="34" width="288" height="180" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <rect x="60" y="60" width="88" height="116" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
        <rect x="164" y="60" width="124" height="36" rx="8" fill="#ECFDF5" stroke="#10B981" strokeWidth="1" />
        <rect x="164" y="108" width="124" height="36" rx="8" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1" />
        <circle cx="104" cy="118" r="10" fill="#6366F1" />
        <path d="M181 78H268" stroke="#10B981" strokeWidth="2" />
        <path d="M181 126H268" stroke="#6366F1" strokeWidth="2" />
      </svg>
    ),
  },
] as const;

const highlights = [
  "Fast graph generation",
  "Readable filters and previews",
  "Persistent scan history",
  "Built for team handoff",
];

export default function HowItWorksPage() {
  return (
    <main className="page-shell">
      <Header />

      <section className="content-grid section-pad">
        <div className="surface-card px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="mt-5 hero-heading leading-tight">
                A simple path from repository URL
                <br />
                <span className="text-[var(--color-text-tertiary)]">to clear architecture insight.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-[var(--color-text-secondary)]">
                RepoLens turns a GitHub repository into a visual map, then keeps every scan in a searchable history so
                you can return to it later.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/#analyze" className="btn-primary text-xs uppercase tracking-[0.12em]">
                Start analysis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/history" className="btn-secondary text-xs uppercase tracking-[0.12em]">
                View history
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <div key={item} className="metric-card text-sm text-[var(--color-text-secondary)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.id} className="surface-card overflow-hidden">
                <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-5">
                  <div className="flex items-center justify-between">
                    <div className="badge-chip border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                      {step.id}
                    </div>
                    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-2 text-[var(--color-text-secondary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-5 h-[230px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] dot-grid-bg p-3">
                    {step.illustration}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{step.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-grid pb-16">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="surface-card p-8">
            <div className="micro-label">What happens behind the scenes</div>
            <h2 className="mt-4 section-heading">The workflow is deliberately short.</h2>
            <div className="mt-6 space-y-4">
              {[
                { title: "Collect", text: "The worker fetches repository files and builds a structure the UI can render quickly.", icon: GitBranch },
                { title: "Layout", text: "Dagre arranges the graph so the explorer stays readable even on larger repositories.", icon: Layers3 },
                { title: "Persist", text: "Completed scans are stored in history so you can reopen them from the site navigation.", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4 metric-card">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[var(--color-text-primary)]">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface-card p-6">
              <div className="micro-label">Visual summary</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="compact-card p-4">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">1. Input</div>
                  <div className="mt-2 h-28 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-3 dot-grid-bg">
                    <svg viewBox="0 0 240 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="18" y="18" width="204" height="42" rx="8" fill="#F1F5F9" stroke="#CBD5E1" />
                      <circle cx="48" cy="39" r="6" fill="#6366F1" />
                      <rect x="68" y="31" width="116" height="16" rx="4" fill="#E2E8F0" />
                    </svg>
                  </div>
                </div>
                <div className="compact-card p-4">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">2. Analysis</div>
                  <div className="mt-2 h-28 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-3 dot-grid-bg">
                    <svg viewBox="0 0 240 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="24" y="18" width="80" height="36" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
                      <rect x="138" y="16" width="72" height="42" rx="8" fill="rgba(124,58,237,0.08)" stroke="#7C3AED" strokeWidth="1.5" />
                      <path d="M84 50L118 66" stroke="#CBD5E1" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="mt-4 compact-card p-4">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">3. History</div>
                <div className="mt-2 h-28 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-3 dot-grid-bg">
                  <svg viewBox="0 0 500 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="22" y="20" width="138" height="72" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                    <rect x="180" y="20" width="138" height="72" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                    <rect x="338" y="20" width="138" height="72" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                    <path d="M160 56H178" stroke="#CBD5E1" strokeWidth="3" />
                    <path d="M318 56H336" stroke="#CBD5E1" strokeWidth="3" />
                    <circle cx="58" cy="56" r="8" fill="#6366F1" />
                    <circle cx="216" cy="56" r="8" fill="#7C3AED" />
                    <circle cx="374" cy="56" r="8" fill="#10B981" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="surface-card p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="micro-label">Next step</div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Try it on a real repository.</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/#analyze" className="btn-primary text-xs uppercase tracking-[0.12em]">
                    Start analysis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/signup" className="btn-secondary text-xs uppercase tracking-[0.12em]">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
