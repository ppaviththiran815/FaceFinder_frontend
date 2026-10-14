"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SelfieCapture from "@/components/SelfieCapture";
import { API_URL, api, FoundPhoto, PublicEvent, SearchResult } from "@/lib/api";
import { AuthBrand } from "@/components/auth/AuthShell";

function formatEventDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function FloralCorner({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 260 300" fill="none" aria-hidden="true">
      <path d="M4 257C55 217 46 154 88 116 118 89 158 70 216 22M14 211c27-14 39-30 48-58M66 161c-7-28-2-46 12-66M117 104c-4-24 4-42 24-57M169 65c-1-19 8-34 27-45" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M23 205c-17-18-18-34-8-49 19 10 23 25 8 49ZM64 158c-20-9-27-23-24-40 21 2 32 14 24 40ZM77 100c-4-22 3-37 20-47 11 18 6 34-20 47ZM140 49c2-20 13-32 32-36 5 20-5 34-32 36ZM193 23c10-17 25-23 43-18-3 20-17 27-43 18Z" fill="currentColor" fillOpacity=".32" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10 257c8-17 23-21 38-16-6 17-19 23-38 16ZM53 190c13-13 28-13 41-3-12 14-26 16-41 3ZM106 119c14-12 29-10 40 2-14 12-27 12-40-2ZM157 76c13-13 28-13 41-2-12 15-26 16-41 2Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="37" cy="85" r="3" fill="#d7b77b"/><circle cx="53" cy="73" r="2" fill="#d7b77b"/><circle cx="90" cy="44" r="2.5" fill="#d7b77b"/><circle cx="225" cy="57" r="3" fill="#d7b77b"/>
      <path d="M33 73c7-14 25-18 36-7-2 17-17 27-31 20-9-4-11-7-5-13Z" stroke="#dfc18c" strokeWidth="1.1"/>
    </svg>
  );
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 5-3.3 8.2-8 9.8-4.7-1.6-8-4.8-8-9.8V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
}

function PhotoIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3.5" width="15" height="13" rx="2.5"/><circle cx="7.5" cy="8" r="1.4"/><path d="m17.5 13-4.2-4.2L5 16.5"/></svg>;
}

function Grid({
  photos,
  allowDownload,
  onOpen,
  onReport,
  download,
}: {
  photos: FoundPhoto[];
  allowDownload: boolean;
  onOpen: (photo: FoundPhoto) => void;
  onReport: (id: string) => void;
  download: (id: string) => string;
}) {
  return (
    <div className="guest-photo-grid">
      {photos.map((photo) => (
        <figure key={photo.id} className="guest-photo-card">
          <button type="button" onClick={() => onOpen(photo)} className="guest-photo-preview" aria-label="Open matched photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.thumb_url} alt="Photo of you" loading="lazy" />
          </button>
          <figcaption>
            {allowDownload ? <a href={download(photo.id)}>Download photo</a> : <span />}
            <button type="button" onClick={() => onReport(photo.id)}>Request removal</button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function GuestPage() {
  const { code } = useParams<{ code: string }>();
  const base = `/api/public/${code}`;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [open, setOpen] = useState<FoundPhoto | null>(null);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    api.get<PublicEvent>(base).then(setEvent).catch((error) => setLoadError(error.message));
  }, [base]);

  async function search(selfie: Blob, liveVideo: Blob, sessionId: string) {
    setBusy(true);
    try {
      setVerificationStatus("Verifying your live check...");
      const videoForm = new FormData();
      videoForm.append("session_id", sessionId);
      videoForm.append("video", liveVideo, liveVideo.type.includes("mp4") ? "live-check.mp4" : "live-check.webm");
      const verified = await api.upload<{ verified: boolean; liveness_token: string }>(
        `${base}/liveness/verify`, videoForm
      );
      if (!verified.verified) throw new Error("Live verification failed. Please try again.");

      setVerificationStatus("Verification passed. Finding your photos...");
      const searchForm = new FormData();
      searchForm.append("selfie", selfie, "selfie.jpg");
      searchForm.append("liveness_token", verified.liveness_token);
      setResult(await api.upload<SearchResult>(`${base}/search`, searchForm));
    } finally {
      setBusy(false);
      setVerificationStatus(null);
    }
  }

  async function reportPhoto(id: string) {
    if (!confirm("Ask the organiser to remove this photo?")) return;
    try {
      await api.post(`${base}/removal-request`, { photo_id: id, reason: "Requested by a guest" });
      alert("Thanks. The organiser has been notified.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not send the request.");
    }
  }

  const download = (id: string) => `${API_URL}${base}/photos/${id}/download`;
  const zip = (scope: "matches" | "all") => `${API_URL}${base}/zip?session=${result?.session_id}&scope=${scope}`;

  return (
    <main className="guest-page">
      <FloralCorner className="guest-floral guest-floral-top" />
      <FloralCorner className="guest-floral guest-floral-bottom" />
      <div className="guest-shell">
        <header className="guest-header">
          <AuthBrand />
          <span className="guest-brand-caption">PRIVATE EVENT PHOTO FINDER</span>
        </header>

        {loadError ? (
          <section className="guest-error-card" role="alert">
            <span className="guest-error-mark">!</span>
            <p className="guest-eyebrow">Event unavailable</p>
            <h1>We could not open this gallery</h1>
            <p>{loadError}</p>
            <a href="/">Check the event link or ask your photographer for a new one.</a>
          </section>
        ) : (
          <>
            {!result && (
              <section className="guest-event-card" aria-labelledby="guest-event-title">
                <div className="guest-event-ornament"><span /><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s-7-4.4-7-9.2A3.8 3.8 0 0 1 10 5a3.8 3.8 0 0 1 7 2.8C17 12.6 10 17 10 17Z"/></svg><span /></div>
                {event ? (
                  <>
                    <h1 id="guest-event-title">{event.name}</h1>
                    <div className="guest-event-meta">
                      <span><PhotoIcon />{event.photo_count.toLocaleString()} photos</span>
                      {event.event_date && <><i /> <span>{formatEventDate(event.event_date)}</span></>}
                    </div>
                  </>
                ) : (
                  <div className="guest-event-loading" role="status" aria-label="Loading event details"><span /><i /><i /></div>
                )}

                <div className="guest-intro">
                  <h2>Find your moments from the celebration.</h2>
                  <p><span className="guest-shield"><ShieldIcon /></span>Your selfie is used to match event photos and is not saved to the gallery.</p>
                </div>

                {event && <SelfieCapture eventCode={code} onCapture={search} busy={busy} />}
                {busy && verificationStatus && <p className="guest-search-status" role="status"><span />{verificationStatus}</p>}
              </section>
            )}

            {result && (
              <section className="guest-results-card" aria-labelledby="guest-results-title">
                <div className="guest-results-heading">
                  <div>
                    <p className="guest-eyebrow">Your event gallery</p>
                    <h1 id="guest-results-title">{event?.name ?? "Your photos"}</h1>
                    <p className="guest-results-subtitle">{result.matches.length > 0 ? `We found ${result.matches.length} photo${result.matches.length === 1 ? "" : "s"} of you.` : "No confident matches were found."}</p>
                  </div>
                  <button type="button" className="guest-secondary-button" onClick={() => { setResult(null); setShowClose(false); }}>Search again</button>
                </div>
                {result.matches.length === 0 && <p className="guest-no-matches">Try again in better light, facing the camera. Photos may still be processing if the event was just uploaded.</p>}
                {!!result.matches.length && <Grid photos={result.matches} allowDownload={result.allow_download} onOpen={setOpen} onReport={reportPhoto} download={download} />}
                {result.matches.length > 0 && result.allow_download && <a className="guest-download-all" href={zip("matches")}>Download matched photos <span>ZIP</span></a>}

                {result.close.length > 0 && (
                  <div className="guest-close-matches">
                    <button type="button" className="guest-toggle-matches" aria-expanded={showClose} onClick={() => setShowClose((visible) => !visible)}>
                      {showClose ? "Hide" : "Show"} {result.close.length} possible {result.close.length === 1 ? "match" : "matches"}
                    </button>
                    {showClose && <><p>These photos look similar, but we are less sure they are you.</p><Grid photos={result.close} allowDownload={result.allow_download} onOpen={setOpen} onReport={reportPhoto} download={download} />{result.allow_download && <a className="guest-download-all guest-download-all-secondary" href={zip("all")}>Download all photos shown <span>ZIP</span></a>}</>}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <footer className="guest-footer"><span className="guest-footer-lock"><ShieldIcon /></span><span>Private by design</span><i /><span>Secure photo matching</span></footer>
      </div>

      {open && (
        <div className="guest-lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Matched photo preview">
          <button type="button" className="guest-lightbox-close" onClick={() => setOpen(null)}>Close</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.preview_url} alt="Photo preview" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </main>
  );
}
