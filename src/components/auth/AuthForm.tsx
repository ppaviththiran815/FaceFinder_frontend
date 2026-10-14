"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, api, auth } from "@/lib/api";

type AuthMode = "login" | "register";

function MailIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="m3.5 5 6.5 5 6.5-5"/></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="8.5" width="13" height="9" rx="2"/><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2"/></svg>;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden
    ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg>
    : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3 17 17M8.2 5.2A8.5 8.5 0 0 1 10 5c5.2 0 8 5 8 5a12 12 0 0 1-3.2 3.5M6.1 6.1C3.5 7.5 2 10 2 10s2.8 5 8 5c.8 0 1.6-.1 2.3-.4"/><path d="M8.6 8.6a2 2 0 0 0 2.8 2.8"/></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M10 4l6 6-6 6"/></svg>;
}

function FriendlyError({ message }: { message: string }) {
  return <p className="auth-error" role="alert"><span aria-hidden="true">!</span>{message}</p>;
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const registering = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (registering && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (registering && password !== confirmPassword) {
      setError("The passwords do not match. Please check and try again.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.post<{ token: string }>(
        registering ? "/api/auth/register" : "/api/auth/login",
        { email: email.trim(), password },
      );
      auth.set(result.token);
      router.replace("/dashboard");
    } catch (cause) {
      const message = cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : "We couldn’t complete that request. Please try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function passwordField(id: string, label: string, value: string, setValue: (next: string) => void, visible: boolean, setVisible: (next: boolean) => void) {
    return (
      <label className="auth-field" htmlFor={id}>
        <span className="auth-label">{label}</span>
        <span className="auth-input-wrap">
          <span className="auth-input-icon"><LockIcon /></span>
          <input
            id={id}
            className="auth-input has-icon has-trailing"
            type={visible ? "text" : "password"}
            required
            minLength={registering ? 8 : undefined}
            maxLength={72}
            autoComplete={registering ? "new-password" : "current-password"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
          />
          <button className="auth-eye" type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
            <EyeIcon hidden={visible} />
          </button>
        </span>
      </label>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card-glow" aria-hidden="true" />
      <div className="auth-card-content">
        <p className="auth-kicker">PHOTOGRAPHER PORTAL</p>
        <h2 id="auth-title">{registering ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-subtitle">{registering ? "Start bringing every event moment together." : "Sign in to manage your events and photos."}</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-field" htmlFor="email">
            <span className="auth-label">Email address</span>
            <span className="auth-input-wrap">
              <span className="auth-input-icon"><MailIcon /></span>
              <input
                id="email"
                className="auth-input has-icon"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </span>
          </label>

          {passwordField("password", "Password", password, setPassword, showPassword, setShowPassword)}

          {registering && passwordField("confirm-password", "Confirm password", confirmPassword, setConfirmPassword, showConfirm, setShowConfirm)}

          {!registering && <div className="auth-forgot-row"><Link href="/forgot-password">Forgot password?</Link></div>}
          {error && <FriendlyError message={error} />}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <><span className="auth-spinner" aria-hidden="true" />{registering ? "Creating account…" : "Signing in…"}</> : <>{registering ? "Create account" : "Sign in"}<ArrowIcon /></>}
          </button>
        </form>

        {registering && (
          <p className="auth-switch">
            <span />
            Already have an account?
            <Link href="/login">Sign in</Link>
            <span />
          </p>
        )}
      </div>
    </section>
  );
}
