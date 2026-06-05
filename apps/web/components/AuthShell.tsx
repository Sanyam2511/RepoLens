import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen page-shell dot-grid-bg">
      <div className="relative z-10 content-grid flex min-h-screen flex-col py-8">
        <div className="mb-6 flex items-center justify-between compact-card p-4">
          <Link href="/" className="inline-flex items-center gap-2 ui-label font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="micro-label text-[var(--color-text-tertiary)]">
            RepoLens Account
          </div>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_minmax(360px,440px)]">
          <section className="surface-card p-6 lg:p-8">
            <div className="badge-chip badge-accent inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure access
            </div>
            <h1 className="mt-4 section-heading">{title}</h1>
            <p className="mt-3 max-w-2xl text-[var(--color-text-secondary)]">{subtitle}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Private history", "Your past repo scans stay tied to your account"],
                ["Fast reuse", "Open any prior analysis from the history gallery"],
                ["Single session", "Sign in once and keep working across tabs"],
              ].map(([heading, body]) => (
                <div key={heading} className="metric-card">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{heading}</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 compact-card p-5">
              {children}
            </div>
          </section>

          <aside className="surface-card p-6 lg:p-8">
            <div className="micro-label">What you can do next</div>
            <div className="mt-4 space-y-3">
              {[
                ["Analyze a repository", "Paste any public GitHub URL and build a dependency map."],
                ["Inspect saved runs", "Browse your history and reopen a previous graph."],
                ["Track the structure", "Use the filters to focus on files, APIs, and storage."],
              ].map(([heading, body]) => (
                <div key={heading} className="metric-card">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{heading}</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 compact-card p-5">
              {footer}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
