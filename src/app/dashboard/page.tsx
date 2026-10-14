"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api, auth, EventSummary } from "@/lib/api";
import { AuthBrand } from "@/components/auth/AuthShell";

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/></svg>;
}

function PhotoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5"/></svg>;
}

export default function Dashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [days, setDays] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      auth.clear();
      router.replace("/login");
    } else {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function load() {
    try {
      setEvents(await api.get<EventSummary[]>("/api/events", true));
    } catch (e) {
      onError(e);
    }
  }

  useEffect(() => {
    if (!auth.get()) router.replace("/login");
    else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ev = await api.post<EventSummary>(
        "/api/events",
        { name, event_date: date || null, expires_in_days: days },
        true
      );
      router.push(`/dashboard/events/${ev.id}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="dashboard-brand"><AuthBrand /><span className="dashboard-brand-caption">PHOTOGRAPHER WORKSPACE</span></div>
          <button className="dashboard-signout" type="button" onClick={() => { auth.clear(); router.replace("/login"); }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8M12.5 6.5 16 10l-3.5 3.5M7 10h9"/></svg>
            Sign out
          </button>
        </header>

        <section className="dashboard-intro">
          <div>
            <p className="dashboard-eyebrow">Your workspace</p>
            <h1>Your events</h1>
            <p className="dashboard-intro-copy">Create an event and bring every guest photo together in one place.</p>
          </div>
          {events && events.length > 0 && (
            <div className="dashboard-event-total" aria-label={`${events.length} events`}>
              <span className="dashboard-event-total-number">{events.length}</span>
              <span>{events.length === 1 ? "event" : "events"}</span>
            </div>
          )}
        </section>

        <section className="dashboard-create-card" aria-labelledby="create-event-title">
          <div className="dashboard-section-heading">
            <span className="dashboard-section-icon"><CalendarIcon /></span>
            <div>
              <h2 id="create-event-title">Create a new event</h2>
              <p>Set up a private gallery for your next occasion.</p>
            </div>
          </div>
          <form onSubmit={create} className="dashboard-create-form">
            <label className="dashboard-field dashboard-field-name">
              <span>Event name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Example wedding" />
            </label>
            <label className="dashboard-field">
              <span>Event date <small>Optional</small></span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="dashboard-field dashboard-field-retention">
              <span>Gallery retention</span>
              <span className="dashboard-number-wrap"><input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} /><small>days</small></span>
            </label>
            <button className="dashboard-create-button" disabled={busy || !name.trim()}>
              {busy ? <><span className="dashboard-button-spinner" />Creating...</> : <>Create event <ArrowIcon /></>}
            </button>
          </form>
          {error && <p role="alert" className="dashboard-error">{error}</p>}
        </section>

        <section className="dashboard-events-section" aria-labelledby="events-heading">
          <div className="dashboard-list-heading">
            <div>
              <h2 id="events-heading">Your galleries</h2>
              <p>Open an event to manage its photos and settings.</p>
            </div>
            {events && <span className="dashboard-count-pill">{events.length} {events.length === 1 ? "gallery" : "galleries"}</span>}
          </div>

          {events === null && (
            <div className="dashboard-loading-list" role="status" aria-label="Loading events">
              {[0, 1].map((item) => <div className="dashboard-event-skeleton" key={item}><span /><div><i /><i /></div><b /></div>)}
            </div>
          )}

          {events?.length === 0 && (
            <div className="dashboard-empty-state">
              <span className="dashboard-empty-icon"><CalendarIcon /></span>
              <h3>Your first gallery starts here</h3>
              <p>Create an event above, then upload its photos to build a private, searchable gallery.</p>
            </div>
          )}

          {!!events?.length && (
            <div className="dashboard-event-list">
              {events.map((ev) => (
                <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className="dashboard-event-card">
                  <span className="dashboard-event-icon"><CalendarIcon /></span>
                  <span className="dashboard-event-details">
                    <span className="dashboard-event-name">{ev.name}</span>
                    <span className="dashboard-event-meta"><span><CalendarIcon />{ev.event_date ?? "Date not set"}</span><i /> <span><PhotoIcon />{ev.photo_count ?? 0} photos</span></span>
                  </span>
                  <span className="dashboard-access-code"><small>ACCESS CODE</small><strong>{ev.access_code}</strong></span>
                  <span className="dashboard-event-arrow"><ArrowIcon /></span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <footer className="dashboard-footer"><span className="dashboard-footer-mark">F</span>FaceFinder <i /> Private galleries for unforgettable moments</footer>
      </div>
    </main>
  );
}
