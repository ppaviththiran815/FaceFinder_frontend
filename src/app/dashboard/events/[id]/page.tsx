"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ApiError, api, auth, EventSummary, OwnerPhoto, RemovalRequest, Stats } from "@/lib/api";

const BATCH = 6; // photos per upload request

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [photos, setPhotos] = useState<OwnerPhoto[]>([]);
  const [requests, setRequests] = useState<RemovalRequest[]>([]);
  const [upload, setUpload] = useState({ done: 0, total: 0, active: false });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" && event ? `${window.location.origin}/e/${event.access_code}` : "";

  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        auth.clear();
        router.replace("/login");
      } else setError(e instanceof Error ? e.message : "Something went wrong");
    },
    [router]
  );

  const loadPhotos = useCallback(async () => {
    try {
      setPhotos(await api.get<OwnerPhoto[]>(`/api/events/${id}/photos?limit=200`, true));
    } catch (e) { onError(e); }
  }, [id, onError]);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await api.get<RemovalRequest[]>(`/api/events/${id}/removal-requests`, true));
    } catch (e) { onError(e); }
  }, [id, onError]);

  // Initial load
  useEffect(() => {
    if (!auth.get()) { router.replace("/login"); return; }
    api.get<EventSummary>(`/api/events/${id}`, true).then(setEvent).catch(onError);
    loadPhotos();
    loadRequests();
  }, [id, router, onError, loadPhotos, loadRequests]);

  // Poll processing progress
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const s = await api.get<Stats>(`/api/events/${id}/stats`, true);
        if (!stop) setStats(s);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [id]);

  // Refresh the grid whenever more photos finish processing
  useEffect(() => { if (stats) loadPhotos(); }, [stats?.done, stats?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;
      setError(null);
      setUpload({ done: 0, total: images.length, active: true });
      for (let i = 0; i < images.length; i += BATCH) {
        const form = new FormData();
        images.slice(i, i + BATCH).forEach((f) => form.append("files", f));
        try {
          const res = await api.upload<{ rejected: { name: string; reason: string }[] }>(
            `/api/events/${id}/photos`, form, true
          );
          if (res.rejected.length) setError(`Skipped ${res.rejected.length} file(s): ${res.rejected[0].name} - ${res.rejected[0].reason}`);
        } catch (e) { onError(e); }
        setUpload((u) => ({ ...u, done: Math.min(i + BATCH, images.length) }));
      }
      setUpload((u) => ({ ...u, active: false }));
      loadPhotos();
    },
    [id, onError, loadPhotos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
  });

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo permanently?")) return;
    try {
      await api.del(`/api/events/${id}/photos/${photoId}`, true);
      setPhotos((p) => p.filter((x) => x.id !== photoId));
    } catch (e) { onError(e); }
  }

  async function resolve(reqId: string, del: boolean) {
    try {
      await api.post(`/api/events/${id}/removal-requests/${reqId}/resolve?delete_photo=${del}`, undefined, true);
      loadRequests();
      if (del) loadPhotos();
    } catch (e) { onError(e); }
  }

  async function retryFailed() {
    try { await api.post(`/api/events/${id}/reprocess-failed`, undefined, true); } catch (e) { onError(e); }
  }

  async function deleteEvent() {
    if (!confirm("Delete this event, all its photos and face data? This cannot be undone.")) return;
    try { await api.del(`/api/events/${id}`, true); router.push("/dashboard"); } catch (e) { onError(e); }
  }

  const processed = stats ? stats.done + stats.failed : 0;
  const pct = stats && stats.total ? Math.round((processed / stats.total) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand underline">← All events</Link>
      <h1 className="mt-2 text-2xl font-semibold">{event?.name ?? "Loading…"}</h1>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_220px]">
        <section className="space-y-5">
          <div
            {...getRootProps()}
            className={`card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed py-12 text-center ${
              isDragActive ? "border-brand bg-brand-soft" : "border-slate-300"
            }`}
          >
            <input {...getInputProps()} />
            <p className="font-medium">Drop photos here, or click to choose</p>
            <p className="mt-1 text-sm text-slate-500">JPG, PNG or WebP. Up to 30 MB each. Upload as many as you like.</p>
          </div>

          {upload.active && (
            <p className="text-sm text-slate-700">Uploading {upload.done} of {upload.total}…</p>
          )}

          {stats && stats.total > 0 && (
            <div className="card">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium">
                  Face processing: {processed.toLocaleString()} / {stats.total.toLocaleString()} photos
                </p>
                <p className="text-slate-500">{stats.faces.toLocaleString()} faces found</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              {stats.failed > 0 && (
                <p className="mt-3 text-sm text-red-700">
                  {stats.failed} photo(s) failed.{" "}
                  <button className="underline" onClick={retryFailed}>Retry them</button>
                </p>
              )}
              {pct === 100 && stats.failed === 0 && (
                <p className="mt-3 text-sm text-green-700">All photos are ready. Share the link with your guests.</p>
              )}
            </div>
          )}
        </section>

        <aside className="card h-fit text-center">
          {event && (
            <>
              <QRCodeSVG value={shareUrl} size={160} className="mx-auto" />
              <p className="mt-3 font-mono text-lg tracking-widest">{event.access_code}</p>
              <button
                className="btn-secondary mt-3 w-full"
                onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              >
                {copied ? "Link copied" : "Copy guest link"}
              </button>
              {stats && <p className="mt-3 text-xs text-slate-500">{stats.searches} guest searches</p>}
            </>
          )}
        </aside>
      </div>

      {requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Removal requests</h2>
          <div className="mt-3 space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="card flex items-center gap-4">
                {r.thumb_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.thumb_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                <p className="flex-1 text-sm text-slate-700">{r.reason || "A guest asked for this photo to be removed."}</p>
                <button className="btn-secondary" onClick={() => resolve(r.id, false)}>Keep</button>
                <button className="btn-danger" onClick={() => resolve(r.id, true)}>Delete photo</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Photos</h2>
        {photos.length === 0 ? (
          <p className="mt-3 text-slate-600">No photos yet. Drop some above to get started.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-200">
                {p.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumb_url} alt={p.name ?? "Event photo"} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-slate-500">
                    {p.status === "failed" ? "Failed" : p.status === "pending" ? "Queued for processing…" : "Processing…"}
                  </div>
                )}
                <button
                  onClick={() => deletePhoto(p.id)}
                  className="absolute right-1 top-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 focus:opacity-100 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 border-t border-slate-200 pt-6">
        <button className="btn-danger" onClick={deleteEvent}>Delete this event</button>
      </section>
    </main>
  );
}
