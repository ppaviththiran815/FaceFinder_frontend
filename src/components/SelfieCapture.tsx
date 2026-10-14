"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

type Props = {
  eventCode: string;
  onCapture: (selfie: Blob, video: Blob, sessionId: string) => Promise<void>;
  busy?: boolean;
};

type CameraState = "idle" | "starting" | "live" | "denied" | "unavailable" | "unsupported";
type Step = "blink";
type Alignment = { aligned: boolean; message: string };

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not capture a camera frame."))), "image/jpeg", quality);
  });
}

export default function SelfieCapture({ eventCode, onCapture, busy = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const alignmentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alignedStreakRef = useRef(0);
  const livenessStartedRef = useRef(false);
  const startLivenessRef = useRef<() => void>(() => undefined);

  const [state, setState] = useState<CameraState>("idle");
  const [phase, setPhase] = useState<"align" | "challenge" | "verifying" | "review">("align");
  const [consent, setConsent] = useState(false);
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [stepNumber, setStepNumber] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setLocalError(null);
    setAlignment(null);
    setReady(false);
    alignedStreakRef.current = 0;
    livenessStartedRef.current = false;
    setPhase("align");
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 0.5625 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
    } catch (error) {
      stopCamera();
      if (error instanceof DOMException && ["NotFoundError", "DevicesNotFoundError", "OverconstrainedError"].includes(error.name)) {
        setState("unavailable");
        setLocalError("No usable camera was found. Connect or enable a camera, then try again.");
      } else if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) {
        setState("denied");
        setLocalError("Camera permission was blocked. Allow camera access in your browser settings, then try again.");
      } else {
        setState("denied");
        setLocalError(error instanceof Error ? error.message : "Could not start your camera. Check browser permissions and try again.");
      }
    }
  }

  useEffect(() => {
    if (state !== "live" || phase !== "align") return;
    let cancelled = false;
    let timer = 0;

    async function checkFrame() {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (!cancelled) timer = window.setTimeout(checkFrame, 500);
        return;
      }
      try {
        const canvas = alignmentCanvasRef.current ?? document.createElement("canvas");
        alignmentCanvasRef.current = canvas;
        const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = await canvasBlob(canvas, 0.55);
        const form = new FormData();
        form.append("frame", frame, "alignment.jpg");
        const response = await fetch(`${API_URL}/api/public/${eventCode}/liveness/alignment`, { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Camera alignment check failed.");
        if (cancelled) return;
        const next = result as Alignment;
        setAlignment(next);
        alignedStreakRef.current = next.aligned ? alignedStreakRef.current + 1 : 0;
        setReady(alignedStreakRef.current >= 3);
      } catch (error) {
        if (!cancelled) {
          setAlignment({ aligned: false, message: error instanceof Error ? error.message : "Could not check face alignment." });
          alignedStreakRef.current = 0;
          setReady(false);
        }
      }
      if (!cancelled) timer = window.setTimeout(checkFrame, 750);
    }

    checkFrame();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [eventCode, phase, state]);

  async function createSelfie(): Promise<Blob> {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) throw new Error("Camera is not ready. Please try again.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvasBlob(canvas, 0.9);
  }

  async function startLiveness() {
    const stream = streamRef.current;
    if (!stream || !ready || busy) return;
    setLocalError(null);
    let recorder: MediaRecorder | null = null;
    let recording: Promise<Blob> | null = null;
    try {
      if (!("MediaRecorder" in window)) throw new Error("This browser cannot record the live check. Try an up-to-date mobile browser.");
      const challengeResponse = await fetch(`${API_URL}/api/public/${eventCode}/liveness/challenge`, { method: "POST" });
      const challengeBody = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challengeBody.detail || "Could not start the live check.");

      const actions = challengeBody.actions as Step[];
      const sessionId = challengeBody.session_id as string;
      if (!Array.isArray(actions) || actions.length !== 1 || actions[0] !== "blink" || !sessionId) {
        throw new Error("The server returned an invalid live check.");
      }
      const stepMilliseconds = Math.max(2000, Math.min(5000, Number(challengeBody.action_seconds || 2.8) * 1000));

      const mimeType = ["video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const activeRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder = activeRecorder;
      const chunks: BlobPart[] = [];
      recording = new Promise<Blob>((resolve, reject) => {
        activeRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        activeRecorder.onerror = () => reject(new Error("Camera recording failed. Please try again."));
        activeRecorder.onstop = () => resolve(new Blob(chunks, { type: activeRecorder.mimeType || "video/webm" }));
      });

      setPhase("challenge");
      setStepCount(actions.length);
      activeRecorder.start(200);
      for (let i = 0; i < actions.length; i++) {
        setStep(actions[i]);
        setStepNumber(i + 1);
        await wait(stepMilliseconds);
      }
      const selfie = await createSelfie();
      activeRecorder.stop();
      const liveVideo = await recording;
      setPreview(URL.createObjectURL(selfie));
      stopCamera();
      setPhase("verifying");
      await onCapture(selfie, liveVideo, sessionId);
      setPhase("review");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Live verification failed. Please retry.");
      setPhase("review");
      if (recorder?.state === "recording") recorder.stop();
      if (recording) await recording.catch(() => undefined);
      stopCamera();
      setState("idle");
    }
  }

  startLivenessRef.current = () => { void startLiveness(); };

  useEffect(() => {
    if (state !== "live" || phase !== "align" || !ready || busy || livenessStartedRef.current) return;
    livenessStartedRef.current = true;
    startLivenessRef.current();
  }, [busy, phase, ready, state]);

  function retake() {
    setPreview(null);
    setStep(null);
    setStepNumber(0);
    setLocalError(null);
    startCamera();
  }

  const status = phase === "challenge"
    ? "Blink once, then open your eyes."
    : alignment?.message ?? "Center your face inside the guide.";
  const cameraLabel = state === "live"
    ? phase === "challenge" ? "Camera live" : "Camera connected"
    : state === "starting" ? "Connecting camera"
    : state === "denied" ? "Camera blocked"
    : state === "unavailable" ? "Camera unavailable"
    : state === "unsupported" ? "Camera not supported"
    : "Camera preview";

  return (
    <div className="guest-capture">
      <div className={"guest-camera-stage " + (state === "live" ? "is-live" : "")}>
        <video
          ref={videoRef}
          playsInline
          muted
          className={"guest-camera-video " + (state === "live" ? "is-visible" : "")}
          aria-label="Live camera preview"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your captured selfie" className="guest-camera-video guest-selfie-preview" />
        )}

        {state !== "live" && !preview && (
          <div className="guest-camera-placeholder">
            <span className="guest-camera-halo" />
            <svg className="guest-camera-silhouette" viewBox="0 0 240 280" aria-hidden="true">
              <path d="M120 24c-42 0-68 34-68 84 0 30-8 51-24 74-8 12-11 24-4 35 7 12 20 15 34 15h124c14 0 27-3 34-15 7-11 4-23-4-35-16-23-24-44-24-74 0-50-26-84-68-84Z" fill="currentColor" fillOpacity=".17"/>
              <ellipse cx="120" cy="118" rx="43" ry="58" fill="currentColor" fillOpacity=".14"/>
              <path d="M42 261c10-44 38-67 78-67s68 23 78 67" fill="currentColor" fillOpacity=".19"/>
            </svg>
            <div className="guest-placeholder-guide" aria-hidden="true"><i /><i /><i /><i /><span /></div>
            <p>{state === "starting" ? "Requesting camera access..." : state === "denied" ? "Camera permission is blocked." : state === "unavailable" ? "No camera could be found." : state === "unsupported" ? "This browser does not support camera access." : "Your camera preview will appear here."}</p>
          </div>
        )}

        <div className="guest-camera-status">
          <span className="guest-camera-status-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="5" width="11.5" height="10" rx="2"/><path d="m14 8 3.5-2v8L14 12"/><circle cx="8.2" cy="10" r="2.2"/></svg></span>
          {cameraLabel}
        </div>
        <span className={"guest-camera-status-dot " + (state === "live" ? "is-live" : state === "denied" || state === "unavailable" || state === "unsupported" ? "is-error" : "")} aria-hidden="true" />

        {state === "live" && phase === "align" && (
          <div className="guest-live-guide">
            <div className={"guest-face-guide " + (ready ? "is-aligned" : "")} aria-hidden="true"><i /><i /><i /><i /><span /></div>
            <p className={ready ? "is-aligned" : ""} role="status">{ready ? "Face aligned - hold still" : status}</p>
          </div>
        )}

        {state === "live" && phase === "challenge" && (
          <div className="guest-live-challenge" role="status">
            <span>LIVE VERIFICATION - STEP {stepNumber} OF {stepCount}</span>
            <strong>{status}</strong>
          </div>
        )}

        {state === "live" && phase === "verifying" && (
          <div className="guest-camera-verifying" role="status"><span />Sending your live check for verification...</div>
        )}
      </div>

      {phase === "challenge" && <p className="guest-camera-hint" role="status">Keep your face in the guide and blink once when prompted.</p>}
      {state === "live" && phase === "align" && ready && <p className="guest-camera-hint" role="status">Face aligned. Your blink check is starting automatically.</p>}
      {localError && <p role="alert" className="guest-camera-error">{localError}</p>}

      <label className="guest-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span className="guest-custom-checkbox" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m4 10 4 4 8-8"/></svg></span>
        <span>I agree to use my face photo and a short live camera recording to find my event photos.</span>
      </label>

      <button
        type="button"
        onClick={startCamera}
        disabled={!consent || state === "starting" || state === "live" || state === "unsupported"}
        className="guest-enable-camera"
      >
        {state === "starting" ? <><span className="guest-button-spinner" />Starting camera...</> : state === "denied" || state === "unavailable" ? "Try camera again" : state === "live" ? "Camera enabled" : state === "unsupported" ? "Camera unavailable" : <><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="5" width="11.5" height="10" rx="2"/><path d="m14 8 3.5-2v8L14 12"/><circle cx="8.2" cy="10" r="2.2"/></svg>Enable camera &amp; find my photos</>}
      </button>

      {preview && phase !== "verifying" && (
        <button type="button" onClick={retake} disabled={busy} className="guest-retry-camera">
          Retry verification
        </button>
      )}
      <p className="guest-capture-note"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2"/><path d="M7 8V6a3 3 0 1 1 6 0v2"/></svg>Your selfie and live check are used only for secure photo matching.</p>
    </div>
  );
}
