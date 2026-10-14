import Link from "next/link";

type NoticeKind = "password-reset" | "email-verification" | "registration-disabled";

const copy: Record<NoticeKind, { eyebrow: string; title: string; message: string }> = {
  "password-reset": {
    eyebrow: "ACCOUNT SUPPORT",
    title: "Password recovery",
    message: "Use the password reset form to request a secure, expiring link by email.",
  },
  "email-verification": {
    eyebrow: "ACCOUNT SUPPORT",
    title: "Email verification is unavailable",
    message: "Email verification is not required for this private photographer portal. Contact an administrator if you need an account.",
  },
  "registration-disabled": {
    eyebrow: "PRIVATE PORTAL",
    title: "Account creation is restricted",
    message: "FaceFinder accounts are created by an administrator. Contact your administrator to receive your photographer login.",
  },
};

export default function AuthNotice({ kind }: { kind: NoticeKind }) {
  const content = copy[kind];
  return (
    <section className="auth-card auth-notice-card" aria-labelledby="notice-title">
      <div className="auth-card-glow" aria-hidden="true" />
      <div className="auth-card-content">
        <p className="auth-kicker">{content.eyebrow}</p>
        <h2 id="notice-title">{content.title}</h2>
        <p className="auth-subtitle auth-notice-copy">{content.message}</p>
        <div className="auth-notice-actions">
          <Link className="auth-submit" href="/login">Back to sign in</Link>
          {kind !== "registration-disabled" && <Link className="auth-notice-link" href="/login">Back to sign in</Link>}
        </div>
      </div>
    </section>
  );
}
