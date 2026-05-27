import Link from "next/link";
import { ArrowRight, GitBranch, Layers3, Search, ShieldCheck, Sparkles, Waypoints } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const steps = [
  {
    id: "01",
    title: "Paste a repository",
    description:
      "Drop in any public GitHub URL. RepoLens collects the project structure, parses the codebase, and prepares the scan for analysis.",
    accent: "from-sky-100 to-white",
    icon: Search,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="260" rx="28" fill="#F8FAFC" />
        <rect x="34" y="38" width="292" height="44" rx="22" fill="#FFFFFF" stroke="#DBEAFE" />
        <circle cx="66" cy="60" r="10" fill="#0EA5E9" />
        <rect x="92" y="52" width="120" height="16" rx="8" fill="#CBD5E1" />
        <rect x="226" y="52" width="72" height="16" rx="8" fill="#E2E8F0" />
        <rect x="40" y="110" width="92" height="94" rx="22" fill="#E0F2FE" />
        <rect x="146" y="110" width="92" height="94" rx="22" fill="#DCFCE7" />
        <rect x="252" y="110" width="68" height="94" rx="22" fill="#FEF3C7" />
        <path d="M86 126L84 172" stroke="#94A3B8" strokeWidth="3" />
        <path d="M192 126L192 172" stroke="#94A3B8" strokeWidth="3" />
        <path d="M286 126L286 172" stroke="#94A3B8" strokeWidth="3" />
        <circle cx="86" cy="128" r="6" fill="#38BDF8" />
        <circle cx="192" cy="128" r="6" fill="#22C55E" />
        <circle cx="286" cy="128" r="6" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    id: "02",
    title: "Inspect the architecture",
    description:
      "The analyzer groups files, APIs, and storage into a graph. Use filters, zoom controls, and node previews to understand the system quickly.",
    accent: "from-emerald-100 to-white",
    icon: Waypoints,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="260" rx="28" fill="#F8FAFC" />
        <rect x="22" y="24" width="130" height="98" rx="18" fill="#E0F2FE" />
        <rect x="208" y="24" width="130" height="72" rx="18" fill="#FDE68A" />
        <rect x="122" y="136" width="138" height="86" rx="20" fill="#DCFCE7" />
        <path d="M88 122L152 154" stroke="#94A3B8" strokeWidth="3" />
        <path d="M244 96L192 146" stroke="#94A3B8" strokeWidth="3" />
        <path d="M78 74H120" stroke="#94A3B8" strokeWidth="3" />
        <circle cx="86" cy="122" r="8" fill="#0EA5E9" />
        <circle cx="244" cy="96" r="8" fill="#F59E0B" />
        <circle cx="192" cy="154" r="8" fill="#22C55E" />
        <rect x="40" y="48" width="72" height="10" rx="5" fill="#BAE6FD" />
        <rect x="224" y="44" width="76" height="10" rx="5" fill="#FCD34D" />
        <rect x="140" y="164" width="80" height="10" rx="5" fill="#BBF7D0" />
      </svg>
    ),
  },
  {
    id: "03",
    title: "Save and share results",
    description:
      "Every scan is saved to history so you can revisit it later, compare runs, and share the findings with your team.",
    accent: "from-amber-100 to-white",
    icon: ShieldCheck,
    illustration: (
      <svg viewBox="0 0 360 260" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="260" rx="28" fill="#F8FAFC" />
        <rect x="36" y="34" width="288" height="180" rx="26" fill="#FFFFFF" stroke="#E2E8F0" />
        <rect x="60" y="60" width="88" height="116" rx="18" fill="#E0F2FE" />
        <rect x="164" y="60" width="124" height="36" rx="16" fill="#FEF3C7" />
        <rect x="164" y="108" width="124" height="36" rx="16" fill="#DCFCE7" />
        <rect x="164" y="156" width="88" height="24" rx="12" fill="#E2E8F0" />
        <circle cx="104" cy="118" r="26" fill="#0EA5E9" opacity="0.14" />
        <circle cx="104" cy="118" r="12" fill="#0EA5E9" />
        <path d="M181 78H268" stroke="#F59E0B" strokeWidth="3" />
        <path d="M181 126H268" stroke="#22C55E" strokeWidth="3" />
        <path d="M181 174H238" stroke="#94A3B8" strokeWidth="3" />
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
    <main className="page-sky text-slate-900">
      <Header />

      <section className="mx-auto w-[min(1200px,94vw)] py-8">
        <div className="rounded-[40px] border border-slate-200/80 bg-white/90 px-6 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Sparkles className="h-4 w-4" /> How RepoLens works
              </div>
              <h1 className="mt-5 text-4xl md:text-6xl display-font leading-tight text-slate-900">
                A simple path from repository URL to clear architecture insight.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                RepoLens turns a GitHub repository into a visual map, then keeps every scan in a searchable history so
                you can return to it later.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/#analyze" className="brand-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                Start analysis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/history" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm hover:bg-slate-50">
                View history
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,94vw)] py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.id} className="soft-card rounded-[32px] overflow-hidden">
                <div className={`bg-gradient-to-br ${step.accent} p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                      {step.id}
                    </div>
                    <div className="rounded-full bg-white/90 p-2 text-slate-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-5 h-[230px] rounded-[26px] bg-white/70 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
                    {step.illustration}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl display-font text-slate-900">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,94vw)] py-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="rounded-[36px] border border-slate-200/80 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">What happens behind the scenes</div>
            <h2 className="mt-4 text-3xl md:text-4xl display-font text-slate-900">The workflow is deliberately short.</h2>
            <div className="mt-6 space-y-4">
              {[
                {
                  title: "Collect",
                  text: "The worker fetches repository files and builds a structure the UI can render quickly.",
                  icon: GitBranch,
                },
                {
                  title: "Layout",
                  text: "Dagre arranges the graph so the explorer stays readable even on larger repositories.",
                  icon: Layers3,
                },
                {
                  title: "Persist",
                  text: "Completed scans are stored in history so you can reopen them from the site navigation.",
                  icon: ShieldCheck,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="soft-card rounded-[32px] p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Visual summary</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">1. Input</div>
                  <div className="mt-2 h-28 rounded-2xl bg-gradient-to-br from-sky-50 to-white p-3">
                    <svg viewBox="0 0 240 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="18" y="18" width="204" height="42" rx="21" fill="#FFFFFF" stroke="#DBEAFE" />
                      <circle cx="48" cy="39" r="8" fill="#0EA5E9" />
                      <rect x="68" y="31" width="116" height="16" rx="8" fill="#CBD5E1" />
                      <rect x="36" y="74" width="168" height="12" rx="6" fill="#E2E8F0" />
                    </svg>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">2. Analysis</div>
                  <div className="mt-2 h-28 rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-3">
                    <svg viewBox="0 0 240 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="24" y="18" width="80" height="36" rx="12" fill="#E0F2FE" />
                      <rect x="138" y="16" width="72" height="42" rx="12" fill="#FDE68A" />
                      <rect x="82" y="62" width="78" height="34" rx="12" fill="#DCFCE7" />
                      <path d="M84 50L118 66" stroke="#94A3B8" strokeWidth="3" />
                      <path d="M154 58L136 72" stroke="#94A3B8" strokeWidth="3" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">3. History</div>
                <div className="mt-2 h-28 rounded-2xl bg-gradient-to-br from-amber-50 to-white p-3">
                  <svg viewBox="0 0 500 112" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="22" y="20" width="138" height="72" rx="20" fill="#FFFFFF" stroke="#E2E8F0" />
                    <rect x="180" y="20" width="138" height="72" rx="20" fill="#FFFFFF" stroke="#E2E8F0" />
                    <rect x="338" y="20" width="138" height="72" rx="20" fill="#FFFFFF" stroke="#E2E8F0" />
                    <path d="M160 56H178" stroke="#CBD5E1" strokeWidth="4" />
                    <path d="M318 56H336" stroke="#CBD5E1" strokeWidth="4" />
                    <circle cx="58" cy="56" r="10" fill="#0EA5E9" />
                    <circle cx="216" cy="56" r="10" fill="#F59E0B" />
                    <circle cx="374" cy="56" r="10" fill="#22C55E" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Next step</div>
                  <h3 className="mt-2 text-2xl display-font text-slate-900">Try it on a real repository.</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/#analyze" className="brand-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                    Start analysis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/signup" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm hover:bg-slate-50">
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
