"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, Mail, Sparkles, UserPlus } from "lucide-react";
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
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

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
      title="Create your RepoLens account"
      subtitle="Sign up once and keep your analysis history, cached scans, and repository revisits tied to your profile."
      footer={
        <div className="space-y-3">
          <div className="micro-label">Already have an account?</div>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">Use your existing credentials to jump straight into the history gallery.</p>
          <Link href="/login" className="btn-primary text-sm">
            <CheckCircle2 className="h-4 w-4" /> Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block ui-label text-[var(--color-text-secondary)]">Name</label>
          <div className="flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="John Doe"
              className="input-field w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block ui-label text-[var(--color-text-secondary)]">Email</label>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="input-field w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block ui-label text-[var(--color-text-secondary)]">Password</label>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="input-field w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block ui-label text-[var(--color-text-secondary)]">Confirm password</label>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              className="input-field w-full"
              required
            />
          </div>
        </div>

        {error ? (
          <div className="badge-chip badge-cycle px-4 py-3 text-sm normal-case tracking-normal">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create account
        </button>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Already signed up? <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:underline">Go to login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
