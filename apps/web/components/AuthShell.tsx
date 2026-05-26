import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen page-sky text-slate-900">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 12%, rgba(219, 234, 254, 0.85), transparent 50%), radial-gradient(circle at 82% 14%, rgba(191, 219, 254, 0.6), transparent 46%), radial-gradient(circle at 20% 88%, rgba(224, 231, 255, 0.55), transparent 52%)",
          }}
        />
        <div className="absolute -top-28 -right-20 h-[280px] w-[280px] rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute -bottom-36 -left-20 h-[380px] w-[380px] rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            <Sparkles className="h-3.5 w-3.5" /> RepoLens Account
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_minmax(360px,440px)]">
          <section className="section-wave border border-slate-200/70 bg-white/90 p-6 backdrop-blur lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure access
            </div>
            <h1 className="mt-4 text-3xl text-slate-900 md:text-4xl display-font">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{subtitle}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Private history", "Your past repo scans stay tied to your account"],
                ["Fast reuse", "Open any prior analysis from the history gallery"],
                ["Single session", "Sign in once and keep working across tabs"],
              ].map(([heading, body]) => (
                <div key={heading} className="soft-card rounded-2xl bg-slate-50/70 p-4">
                  <div className="text-sm font-semibold text-slate-900">{heading}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
              {children}
            </div>
          </section>

          <aside className="section-wave border border-slate-200/70 bg-white/90 p-6 backdrop-blur lg:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What you can do next</div>
            <div className="mt-4 space-y-3">
              {[
                ["Analyze a repository", "Paste any public GitHub URL and build a dependency map."],
                ["Inspect saved runs", "Browse your history and reopen a previous graph."],
                ["Track the structure", "Use the filters to focus on files, APIs, and storage."],
              ].map(([heading, body]) => (
                <div key={heading} className="soft-card rounded-2xl bg-slate-50/70 p-4">
                  <div className="text-sm font-semibold text-slate-900">{heading}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
              {footer}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
