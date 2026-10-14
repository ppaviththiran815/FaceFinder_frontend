"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { ApiError, api } from "@/lib/api";

export default function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/password-reset/request", { email: email.trim() });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Cannot reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <section className="auth-card auth-notice-card" aria-labelledby="forgot-title">
        <div className="auth-card-glow" aria-hidden="true" />
        <div className="auth-card-content">
          <p className="auth-kicker">ACCOUNT SUPPORT</p>
          <h2 id="forgot-title">Reset your password</h2>
          {sent ? (
            <>
              <p className="auth-subtitle auth-notice-copy">If an account exists for that email, a secure reset link has been sent. Check your inbox and spam folder.</p>
              <div className="auth-notice-actions"><Link className="auth-submit" href="/login">Back to sign in</Link></div>
            </>
          ) : (
            <>
              <p className="auth-subtitle auth-notice-copy">Enter your registered email and we’ll send a secure, expiring reset link.</p>
              <form className="auth-form" onSubmit={submit} noValidate>
                <label className="auth-field" htmlFor="reset-email">
                  <span className="auth-label">Email address</span>
                  <input id="reset-email" className="auth-input" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                {error && <p className="auth-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}
                <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
              </form>
              <div className="auth-notice-actions"><Link className="auth-notice-link" href="/login">Back to sign in</Link></div>
            </>
          )}
        </div>
      </section>
    </AuthShell>
  );
}
