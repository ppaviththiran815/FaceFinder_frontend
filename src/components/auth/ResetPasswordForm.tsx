"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { ApiError, api } from "@/lib/api";

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This reset link is missing or invalid.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/password-reset/complete", { token, password });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Cannot reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <section className="auth-card auth-notice-card" aria-labelledby="reset-title">
        <div className="auth-card-glow" aria-hidden="true" />
        <div className="auth-card-content">
          <p className="auth-kicker">ACCOUNT SUPPORT</p>
          <h2 id="reset-title">Choose a new password</h2>
          {done ? (
            <>
              <p className="auth-subtitle auth-notice-copy">Your password has been updated. You can now sign in with your new password.</p>
              <div className="auth-notice-actions"><Link className="auth-submit" href="/login">Back to sign in</Link></div>
            </>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              <label className="auth-field" htmlFor="new-password"><span className="auth-label">New password</span><input id="new-password" className="auth-input" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <label className="auth-field" htmlFor="confirm-password"><span className="auth-label">Confirm password</span><input id="confirm-password" className="auth-input" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
              {error && <p className="auth-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}
              <button className="auth-submit" type="submit" disabled={busy || !token}>{busy ? "Updating…" : "Update password"}</button>
            </form>
          )}
        </div>
      </section>
    </AuthShell>
  );
}
