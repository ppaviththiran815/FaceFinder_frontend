import Link from "next/link";

function BrandMark() {
  return (
    <Link href="/" className="auth-brand" aria-label="FaceFinder home">
      <svg className="auth-brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="facefinder-mark" x1="7" y1="4" x2="41" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A78BFA" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <path fill="url(#facefinder-mark)" d="M9 43V15.8C9 8.73 14.73 3 21.8 3H42l-4.65 8.14H22.1a4.95 4.95 0 0 0-4.95 4.95v5.1h17.3l-4.4 7.6H17.15V43H9Z" />
        <path fill="#818CF8" d="M17.15 34.1h9.06L17.15 43v-8.9Z" />
      </svg>
      <span>FaceFinder</span>
    </Link>
  );
}

function FeatureIcon({ kind }: { kind: "shield" | "spark" | "camera" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "shield") return <svg viewBox="0 0 32 32" aria-hidden="true" {...common}><path d="M16 3 27 7v8c0 7-4.8 11.6-11 14C9.8 26.6 5 22 5 15V7l11-4Z"/><rect x="12" y="14" width="8" height="7" rx="1.5"/><path d="M14 14v-2a2 2 0 0 1 4 0v2"/></svg>;
  if (kind === "spark") return <svg viewBox="0 0 32 32" aria-hidden="true" {...common}><path d="m18 3-11 16h8l-1 10 12-17h-9l1-9Z"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true" {...common}><path d="M11 8 13 5h6l2 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h5Z"/><circle cx="16" cy="17" r="5"/></svg>;
}

const features = [
  { kind: "shield" as const, title: "Private by design", body: "Your photos, your control" },
  { kind: "spark" as const, title: "Instant photo discovery", body: "Find the moments that matter" },
  { kind: "camera" as const, title: "Built for photographers", body: "Powerful. Simple. Reliable." },
];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="FaceFinder event photo discovery">
        <div className="auth-visual-photo" />
        <div className="auth-visual-glow" />
        <header className="auth-visual-header"><BrandMark /><span className="auth-brand-caption">EVENT PHOTOGRAPHY <i /> FACE MATCHING</span></header>
        <div className="auth-story">
          <p className="auth-eyebrow">A better way to relive it</p>
          <h1>Every moment.<br />Easily <em>found.</em></h1>
          <p className="auth-story-copy">Find your event photos with secure,<br className="desktop-break" /> face-powered discovery.</p>
        </div>
        <div className="auth-features">
          {features.map((feature) => (
            <article className="auth-feature" key={feature.title}>
              <span className="auth-feature-icon"><FeatureIcon kind={feature.kind} /></span>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
        <a className="auth-photo-credit" href="https://unsplash.com/photos/wedding-couple-with-guests-holding-sparklers-at-night-6E-pmvRa3AU" target="_blank" rel="noreferrer">Photo by Fotografo Samuel Cruz / Unsplash</a>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-brand"><BrandMark /></div>
        <div className="auth-panel-content">{children}</div>
        <p className="auth-security-note"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2"/><path d="M7 8V6a3 3 0 1 1 6 0v2"/></svg>Secure access to your photography workspace</p>
      </section>
    </main>
  );
}

export function AuthBrand() {
  return <BrandMark />;
}
