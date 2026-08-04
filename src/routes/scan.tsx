import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, RefreshCw, ScanLine, ShieldAlert, Upload, X } from "lucide-react";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { analyzeHealthScan } from "@/lib/scan.functions";
import type { ScanResult } from "@/lib/scan.server";
import { logScan } from "@/lib/audit";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "AI Health Scan — HealthFury OS" },
      {
        name: "description",
        content:
          "Scan yourself with your camera and get AI visual health observations plus a safe next-step recommendation.",
      },
      { property: "og:title", content: "AI Health Scan — HealthFury OS" },
      {
        property: "og:description",
        content: "Camera-based AI health observations with safe, non-diagnostic next steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

const URGENCY_STYLE: Record<ScanResult["urgency"], string> = {
  "self-care": "bg-[oklch(0.55_0.11_155)]",
  "see a GP soon": "bg-[oklch(0.6_0.15_65)]",
  "see a doctor today": "bg-[oklch(0.58_0.18_45)]",
  "seek emergency care": "bg-[oklch(0.5_0.19_25)]",
};

function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [camOn, setCamOn] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [shot, setShot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const analyze = useServerFn(analyzeHealthScan);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }, []);

  const startCam = useCallback(
    async (mode: "user" | "environment") => {
      setError(null);
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        streamRef.current = stream;
        setCamOn(true);
        setShot(null);
        setResult(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError("Camera access was blocked. Allow camera permission, or upload a photo instead.");
        setCamOn(false);
      }
    },
    [],
  );

  useEffect(() => stopCam, [stopCam]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.85));
    setResult(null);
    stopCam();
  };

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setShot(String(reader.result));
      setResult(null);
      stopCam();
    };
    reader.readAsDataURL(file);
  };

  const runScan = async () => {
    if (!shot) return;
    setBusy(true);
    setError(null);
    try {
      const mimeType = shot.slice(5, shot.indexOf(";")) || "image/jpeg";
      const data = await analyze({ data: { imageDataUrl: shot, mimeType, notes: notes || undefined } });
      setResult(data as ScanResult);
      void logScan({
        scanType: "health",
        status: "success",
        summary: (data as ScanResult).overallImpression,
        urgency: (data as ScanResult).urgency,
        findings: (data as ScanResult).observations.map((o) => `${o.area}: ${o.finding} (${o.confidence})`),
      });
    } catch {
      setError("The scan could not be completed. Please try again in a moment.");
      void logScan({
        scanType: "health",
        status: "failed",
        summary: "The scan could not be completed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setShot(null);
    setResult(null);
    setError(null);
  };

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
          >
            ‹
          </Link>
          <AnkhLogo size={40} />
          <span className="h-9 w-9" />
        </div>

        <h1 className="mt-3 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          AI HEALTH SCAN
        </h1>
        <p className="mt-1 text-center font-body text-xs text-foreground/70">
          Point the camera at your face, eyes, throat or skin. The AI describes what it can see and
          recommends a safe next step — it does not diagnose.
        </p>
        <div className="mt-2 text-center">
          <Link
            to="/audit"
            className="font-body text-[11px] font-semibold underline underline-offset-2 text-[oklch(0.6_0.15_65)]"
          >
            View scan audit log
          </Link>
        </div>

        {/* Viewport */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-[oklch(0.72_0.14_75)] bg-black shadow-lg">
          <div className="relative aspect-[3/4] w-full">
            {shot ? (
              <img src={shot} alt="Captured health scan frame" className="h-full w-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${camOn ? "" : "opacity-30"}`}
              />
            )}

            {camOn && !shot && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-6 rounded-[40%] border-2 border-[oklch(0.85_0.15_80_/_0.7)]" />
                <div className="absolute inset-x-0 top-0 h-0.5 animate-[scanline_2.4s_linear_infinite] bg-[oklch(0.85_0.15_80)] shadow-[0_0_14px_oklch(0.85_0.15_80)]" />
              </div>
            )}

            {!camOn && !shot && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
                <ScanLine className="h-10 w-10" />
                <p className="font-body text-xs">Camera is off</p>
              </div>
            )}

            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                <ScanLine className="h-8 w-8 animate-pulse" />
                <p className="font-display text-xs uppercase tracking-widest">Analysing…</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-4">
          {!shot ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = facing === "user" ? "environment" : "user";
                  setFacing(next);
                  if (camOn) void startCam(next);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
                aria-label="Switch camera"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => (camOn ? capture() : void startCam(facing))}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.7_0.2_35)] to-[oklch(0.4_0.18_25)] font-display text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_0_30px_oklch(0.6_0.2_35_/_0.6)] ring-2 ring-[oklch(0.85_0.15_80)]"
              >
                {camOn ? "Capture" : "Scan"}
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
                aria-label="Upload a photo"
              >
                <Upload className="h-5 w-5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                className="flex h-11 items-center gap-1.5 rounded-full bg-white/80 px-4 font-display text-xs uppercase tracking-wider text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
              >
                <X className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runScan}
                className="flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] px-5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow disabled:opacity-40"
              >
                <Camera className="h-4 w-4" /> {busy ? "Scanning…" : "Run AI scan"}
              </button>
            </>
          )}
        </div>

        {!result && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Optional: what feels wrong? e.g. sore throat for 3 days, itchy rash"
            className="mt-4 w-full rounded-md border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 font-body text-sm focus:border-[oklch(0.72_0.14_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.14_75_/_0.3)]"
          />
        )}

        {error && (
          <p className="mt-3 rounded-md bg-[oklch(0.5_0.19_25_/_0.1)] px-3 py-2 font-body text-xs text-[oklch(0.4_0.18_25)]">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5 space-y-3 rounded-xl border border-[oklch(0.82_0.1_80)] bg-white/85 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold uppercase tracking-wider text-[oklch(0.45_0.12_75)]">
                Scan report
              </p>
              <span
                className={`rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-white ${URGENCY_STYLE[result.urgency]}`}
              >
                {result.urgency}
              </span>
            </div>

            <p className="font-body text-sm text-foreground/85">{result.overallImpression}</p>

            {result.redFlags.length > 0 && (
              <div className="rounded-md border border-[oklch(0.7_0.19_25_/_0.5)] bg-[oklch(0.98_0.03_35)] p-3">
                <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[oklch(0.4_0.18_25)]">
                  <ShieldAlert className="h-4 w-4" /> Urgent signs
                </p>
                <ul className="mt-1 list-disc pl-4 font-body text-xs text-[oklch(0.4_0.18_25)]">
                  {result.redFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.observations.length > 0 && (
              <Section title="What the camera saw">
                {result.observations.map((o) => (
                  <li key={o.area + o.finding}>
                    <span className="font-semibold">{o.area}:</span> {o.finding}{" "}
                    <span className="text-foreground/50">({o.confidence} confidence)</span>
                  </li>
                ))}
              </Section>
            )}

            {result.possibleRelatedConditions.length > 0 && (
              <Section title="Could be related to">
                {result.possibleRelatedConditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </Section>
            )}

            {result.selfCare.length > 0 && (
              <Section title="Safe self-care">
                {result.selfCare.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </Section>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                to="/chat"
                className="flex-1 rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] py-2 text-center font-display text-xs font-semibold uppercase tracking-wider text-white shadow"
              >
                Discuss with AI
              </Link>
              <Link
                to="/booking"
                className="flex-1 rounded-full border border-[oklch(0.72_0.14_75)] bg-white py-2 text-center font-display text-xs font-semibold uppercase tracking-wider text-[oklch(0.5_0.13_70)]"
              >
                Book a clinic
              </Link>
            </div>

            <p className="pt-1 font-body text-[11px] italic text-foreground/60">
              This is a general visual observation, not medical advice or a diagnosis.
            </p>
          </div>
        )}
      </div>
    </HieroFrame>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.12_75)]">
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-4 font-body text-xs text-foreground/80">{children}</ul>
    </div>
  );
}