import Link from "next/link";
import { ReactNode } from "react";
import BrandMark from "./BrandMark";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[var(--color-bg-base)] overflow-hidden p-4 sm:p-8">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-bg-surface)] via-transparent to-transparent"></div>
      <div className="absolute inset-0 dot-grid-bg opacity-40 mix-blend-multiply"></div>
      
      {/* Glowing orbs */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="surface-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-8 sm:p-10 rounded-[2rem] border border-white/60 backdrop-blur-xl bg-white/80">
          <div className="flex justify-center mb-6">
            <Link href="/" className="flex items-center justify-center gap-3 text-[var(--color-text-primary)] hover:-translate-y-0.5 transition-transform cursor-pointer">
              <BrandMark className="h-10 w-10" />
              <span className="text-2xl font-bold tracking-tight">RepoLens</span>
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
