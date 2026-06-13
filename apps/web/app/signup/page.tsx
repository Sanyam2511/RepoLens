"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LockKeyhole, Mail, Sparkles, UserPlus, Github } from "lucide-react";
import AuthShell from "../../components/AuthShell";
import { setAuthSession, workerFetch } from "../../lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await workerFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to create account");
      }

      setAuthSession(payload);
      router.push("/history");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up in a minute and keep your past repository analyses safely stored in one place."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <UserPlus className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="John Doe"
              className="input-field w-full !pl-11 h-11 bg-white/50 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="input-field w-full !pl-11 h-11 bg-white/50 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <LockKeyhole className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="input-field w-full !pl-11 h-11 bg-white/50 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Confirm password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <LockKeyhole className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              className="input-field w-full !pl-11 h-11 bg-white/50 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        {error ? (
          <div className="p-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full h-11 shadow-[0_4px_14px_0_rgba(15,23,42,0.15)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5 transition-all"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          Create account
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--color-border-subtle)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
            <span className="bg-white/80 backdrop-blur-sm px-3 text-[var(--color-text-tertiary)]">Or</span>
          </div>
        </div>

        <Link
          href="http://localhost:4000/auth/github"
          className="btn-primary flex items-center justify-center gap-3 w-full h-11 shadow-[0_4px_14px_0_rgba(15,23,42,0.15)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5 transition-all"
        >
          <Github className="h-5 w-5" />
          Sign in with GitHub
        </Link>

        <p className="text-center text-sm text-[var(--color-text-secondary)] pt-4">
          Already signed up? <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:underline">Go to login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
