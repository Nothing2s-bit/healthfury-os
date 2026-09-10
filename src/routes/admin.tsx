import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ShieldCheck,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin QR Verification — HealthFury" },
      {
        name: "description",
        content:
          "Scan patient booking QR codes at reception to verify appointments and check patients in instantly.",
      },
      { property: "og:title", content: "Admin QR Verification — HealthFury" },
      {
        property: "og:description",
        content: "Verify patient booking QR codes and check patients in at the clinic desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminScanPage,
});

type BookingRow = {
  id: string;
  patient_id: string;
  clinic_id: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  reference_code: string;
  qr_payload: string;
  status: string;
  notes: string | null;
  checked_in_at: string | null;
  created_at: string;
};

type PatientFile = {
  id: string;
  mrn: string;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  phone: string | null;
  chief_complaint: string | null;
  condition: string | null;
  status: string;
  bp: string | null;
  hr: string | null;
  temp: string | null;
  spo2: string | null;
  allergies: string[];
  medications: string[];
  photo_path: string | null;
};

type Verified = {
  booking: BookingRow;
  clinicName: string;
  patientName: string;
  file: PatientFile | null;
  photoUrl: string | null;
  history: BookingRow[];
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function refFromScan(raw: string): string | null {
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.ref === "string") return parsed.ref;
  } catch {
    /* not JSON — treat as a plain reference */
  }
  const match = text.match(/HF-[A-Z0-9]+-[A-Z0-9]+/i);
  if (match) return match[0].toUpperCase();
  return text ? text.toUpperCase() : null;
}

function AdminScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Verified | null>(null);
  const [recent, setRecent] = useState<BookingRow[]>([]);

  // Access guard: staff only
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/register", search: { role: "admin" } as never });
        return;
      }
      setStaffId(data.user.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const ok = (roles ?? []).some((r) =>
        ["admin", "doctor", "nurse", "minister"].includes(r.role as string),
      );
      if (!cancelled) setAllowed(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("appointment_date", todayISO())
      .order("appointment_time")
      .limit(50);
    setRecent((data ?? []) as BookingRow[]);
  }, []);

  useEffect(() => {
    if (allowed) void loadRecent();
  }, [allowed, loadRecent]);

  const verifyReference = useCallback(
    async (reference: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      setLookupError(null);
      try {
        const { data: booking, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("reference_code", reference)
          .maybeSingle();
        if (error) throw error;
        if (!booking) {
          setResult(null);
          setLookupError(`No booking found for ${reference}. This code is not valid.`);
          return;
        }
        const row = booking as BookingRow;
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", row.clinic_id)
          .maybeSingle();
        let patientName = "Patient";
        try {
          const payload = JSON.parse(row.qr_payload);
          if (payload?.name) patientName = String(payload.name);
        } catch {
          /* ignore malformed payload */
        }
        setResult({ booking: row, clinicName: clinic?.name ?? "Clinic", patientName });
        stopCamera();
      } catch (e) {
        setLookupError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setChecking(false);
        busyRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setCamError(null);
    setResult(null);
    setLookupError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
      }
      tick();
    } catch {
      setCamError("Camera unavailable. Allow camera access or type the reference below.");
      setScanning(false);
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            const ref = refFromScan(code.data);
            if (ref) {
              void verifyReference(ref);
              return;
            }
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function confirmCheckIn(status: "checked_in" | "no_show") {
    if (!result || !staffId) return;
    setChecking(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status,
          checked_in_at: status === "checked_in" ? new Date().toISOString() : null,
          checked_in_by: status === "checked_in" ? staffId : null,
        })
        .eq("id", result.booking.id);
      if (error) throw error;
      setResult({
        ...result,
        booking: {
          ...result.booking,
          status,
          checked_in_at: status === "checked_in" ? new Date().toISOString() : null,
        },
      });
      await loadRecent();
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Could not update this booking.");
    } finally {
      setChecking(false);
    }
  }

  if (allowed === null) {
    return (
      <HieroFrame className="pb-16">
        <div className="mx-auto flex max-w-md items-center justify-center px-6 pt-24 text-[oklch(0.5_0.12_65)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </HieroFrame>
    );
  }

  if (!allowed) {
    return (
      <HieroFrame className="pb-16">
        <div className="mx-auto max-w-md px-6 pt-6">
          <TopBar />
          <div className="mt-8 rounded-2xl border-2 border-[oklch(0.7_0.18_25)] bg-white/85 p-5 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-[oklch(0.55_0.19_25)]" />
            <h1 className="mt-2 font-display text-xl font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              Staff Only
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Booking verification is limited to admins, doctors and nurses.
            </p>
          </div>
        </div>
      </HieroFrame>
    );
  }

  return (
    <HieroFrame className="pb-20">
      <div className="mx-auto max-w-md px-6 pt-6">
        <TopBar />

        <h1 className="mt-3 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          VERIFY BOOKINGS
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Scan a patient's booking QR code at reception to confirm the visit.
        </p>

        {/* Scanner */}
        <div className="mt-4 overflow-hidden rounded-2xl border-2 border-[oklch(0.72_0.14_75)] bg-black/90 shadow-xl">
          <div className="relative aspect-square w-full">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${scanning ? "" : "hidden"}`}
              muted
              playsInline
            />
            {!scanning && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[oklch(0.22_0.03_60)] text-[oklch(0.85_0.1_80)]">
                <QrCode className="h-14 w-14" />
                <span className="font-display text-xs uppercase tracking-widest">
                  Camera off
                </span>
              </div>
            )}
            {scanning && (
              <div className="pointer-events-none absolute inset-8 rounded-xl border-4 border-[oklch(0.8_0.14_80)]/80" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 bg-[oklch(0.18_0.02_60)] p-3">
            {!scanning ? (
              <button
                onClick={startCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.5_0.12_55)] px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-white shadow"
              >
                <Camera className="h-4 w-4" /> Start Scanner
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[oklch(0.72_0.14_75)] px-4 py-2 font-display text-sm uppercase tracking-wider text-[oklch(0.85_0.1_80)]"
              >
                <CameraOff className="h-4 w-4" /> Stop
              </button>
            )}
          </div>
        </div>

        {camError && (
          <div className="mt-2 rounded-lg border border-[oklch(0.7_0.18_25)] bg-white p-2 text-xs text-[oklch(0.45_0.18_25)]">
            {camError}
          </div>
        )}

        {/* Manual reference */}
        <div className="mt-3 flex gap-2">
          <input
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            placeholder="Type reference e.g. HF-XXXX-XXXXXX"
            className="flex-1 rounded-lg border-2 border-[oklch(0.82_0.1_80)] bg-white/90 px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              const ref = refFromScan(manualRef);
              if (ref) void verifyReference(ref);
            }}
            disabled={!manualRef.trim() || checking}
            className="flex items-center gap-1 rounded-lg bg-[oklch(0.6_0.13_65)] px-3 py-2 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
          >
            <Search className="h-4 w-4" /> Check
          </button>
        </div>

        {checking && (
          <div className="mt-3 flex items-center gap-2 text-sm text-[oklch(0.5_0.12_65)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </div>
        )}

        {lookupError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border-2 border-[oklch(0.7_0.18_25)] bg-[oklch(0.97_0.04_25)] p-3 text-sm text-[oklch(0.45_0.18_25)]">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {/* Verified booking */}
        {result && (
          <div className="mt-4 rounded-2xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-[oklch(0.45_0.14_155)]">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold uppercase tracking-wider">
                Valid Booking
              </h2>
              <StatusPill status={result.booking.status} />
            </div>
            <dl className="mt-3 grid gap-1 text-sm">
              <Row label="Reference" value={result.booking.reference_code} mono />
              <Row label="Patient" value={result.patientName} />
              <Row label="Clinic" value={result.clinicName} />
              <Row label="Department" value={result.booking.department} />
              <Row label="Date" value={result.booking.appointment_date} />
              <Row label="Time" value={result.booking.appointment_time.slice(0, 5)} />
              {result.booking.checked_in_at && (
                <Row
                  label="Checked in"
                  value={new Date(result.booking.checked_in_at).toLocaleString()}
                />
              )}
            </dl>

            {result.booking.appointment_date !== todayISO() && (
              <div className="mt-3 rounded-lg bg-[oklch(0.96_0.06_85)] p-2 text-xs text-[oklch(0.4_0.12_65)]">
                Heads up: this booking is not for today.
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                disabled={checking || result.booking.status === "checked_in"}
                onClick={() => confirmCheckIn("checked_in")}
                className="flex-1 rounded-lg bg-gradient-to-b from-[oklch(0.7_0.15_155)] to-[oklch(0.45_0.13_155)] px-3 py-2 font-display text-sm font-bold uppercase tracking-wider text-white shadow disabled:opacity-50"
              >
                {result.booking.status === "checked_in" ? "Checked In" : "Confirm Check-In"}
              </button>
              <button
                disabled={checking}
                onClick={() => confirmCheckIn("no_show")}
                className="rounded-lg border-2 border-[oklch(0.7_0.18_25)] px-3 py-2 font-display text-sm uppercase tracking-wider text-[oklch(0.45_0.18_25)] disabled:opacity-50"
              >
                No-show
              </button>
            </div>
            <button
              onClick={() => {
                setResult(null);
                setManualRef("");
              }}
              className="mt-2 w-full rounded-lg border border-[oklch(0.82_0.1_80)] px-3 py-2 text-xs uppercase tracking-wider text-[oklch(0.45_0.12_65)]"
            >
              Scan next patient
            </button>
          </div>
        )}

        {/* Today's bookings */}
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            Today's bookings ({recent.length})
          </h2>
          <div className="mt-2 space-y-2">
            {recent.map((b) => (
              <button
                key={b.id}
                onClick={() => void verifyReference(b.reference_code)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-[oklch(0.85_0.08_80)] bg-white/75 p-3 text-left"
              >
                <div>
                  <div className="font-mono text-xs text-[oklch(0.4_0.1_60)]">
                    {b.reference_code}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.department} · {b.appointment_time.slice(0, 5)}
                  </div>
                </div>
                <StatusPill status={b.status} />
              </button>
            ))}
            {recent.length === 0 && (
              <div className="rounded-lg bg-white/70 p-3 text-sm text-muted-foreground">
                No bookings for today yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </HieroFrame>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    checked_in: "bg-[oklch(0.55_0.11_155)]",
    confirmed: "bg-[oklch(0.6_0.13_65)]",
    no_show: "bg-[oklch(0.55_0.19_25)]",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${map[status] ?? "bg-[oklch(0.5_0.02_60)]"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <Link
        to="/dashboard"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
      >
        ‹
      </Link>
      <AnkhLogo size={40} />
      <div className="flex h-9 w-9 items-center justify-center text-[oklch(0.6_0.15_65)]">
        <Clock className="h-4 w-4" />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-[oklch(0.85_0.08_80)] py-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-right text-sm text-[oklch(0.3_0.08_50)] ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
