import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { MapPin, CalendarClock, CheckCircle2, Loader2, Building2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book a Clinic Visit — HealthFury" },
      { name: "description", content: "Book your clinic session, pick a department, get a live QR code, and skip the queue." },
    ],
  }),
  component: BookingPage,
});

type Clinic = {
  id: string;
  name: string;
  address: string;
  area_code: string | null;
  latitude: number;
  longitude: number;
  daily_capacity: number;
  opens_at: string;
  closes_at: string;
};

type ClinicWithMeta = Clinic & { distanceKm: number | null; bookedToday: number };

const DEPARTMENTS = [
  "General Consultation",
  "Chronic Disease Management",
  "Maternity & Antenatal",
  "Pediatrics",
  "Dental",
  "Optometry",
  "Mental Health",
  "HIV / ARV Clinic",
  "TB Clinic",
  "Immunization / Vaccines",
  "Family Planning",
  "Physiotherapy",
  "Radiology / X-Ray",
  "Pathology / Lab",
  "Pharmacy Pickup",
  "Emergency Triage",
];

const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30; // 07:00 -> 17:00 in 30-min steps
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateReference() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `HF-${stamp}-${rand}`;
}

function BookingPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [clinics, setClinics] = useState<ClinicWithMeta[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [date, setDate] = useState<string>(todayISO());
  const [time, setTime] = useState<string>("08:00");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "ready" | "denied">("idle");
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<null | {
    reference: string;
    clinicName: string;
    address: string;
    department: string;
    date: string;
    time: string;
    qrDataUrl: string;
  }>(null);

  // Auth guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/register", search: { role: "patient" } as never });
        return;
      }
      setUserId(data.user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!cancelled && prof?.full_name) setFullName(prof.full_name);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Ask for location
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ready");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Load clinics + today's booking counts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClinics(true);
      const { data: cs } = await supabase
        .from("clinics")
        .select("*")
        .order("name");
      const list = (cs ?? []) as Clinic[];
      const { data: bookedRows } = await supabase
        .from("bookings")
        .select("clinic_id")
        .eq("appointment_date", date);
      const counts = new Map<string, number>();
      (bookedRows ?? []).forEach((r) => {
        counts.set(r.clinic_id, (counts.get(r.clinic_id) ?? 0) + 1);
      });
      const enriched: ClinicWithMeta[] = list.map((c) => ({
        ...c,
        distanceKm: coords
          ? haversineKm(coords, { lat: c.latitude, lng: c.longitude })
          : null,
        bookedToday: counts.get(c.id) ?? 0,
      }));
      enriched.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return a.name.localeCompare(b.name);
      });
      if (!cancelled) {
        setClinics(enriched);
        if (enriched.length && !selectedClinic) setSelectedClinic(enriched[0].id);
        setLoadingClinics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, date]);

  // Live capacity: refresh a clinic's booked count whenever anyone books.
  useEffect(() => {
    const channel = supabase
      .channel("bookings-capacity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        async () => {
          const { data: rows } = await supabase
            .from("bookings")
            .select("clinic_id")
            .eq("appointment_date", date);
          const counts = new Map<string, number>();
          (rows ?? []).forEach((r) => counts.set(r.clinic_id, (counts.get(r.clinic_id) ?? 0) + 1));
          setClinics((prev) => prev.map((c) => ({ ...c, bookedToday: counts.get(c.id) ?? 0 })));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  const selected = useMemo(
    () => clinics.find((c) => c.id === selectedClinic) ?? null,
    [clinics, selectedClinic],
  );
  const isFull = selected ? selected.bookedToday >= selected.daily_capacity : false;

  async function handleBook() {
    if (!userId || !selected) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const reference = generateReference();
      const qrPayload = JSON.stringify({
        v: 1,
        ref: reference,
        patient: userId,
        name: fullName || "Patient",
        clinic: selected.id,
        clinicName: selected.name,
        dept: department,
        date,
        time,
        issuedAt: new Date().toISOString(),
      });

      const { error } = await supabase.from("bookings").insert({
        patient_id: userId,
        clinic_id: selected.id,
        department,
        appointment_date: date,
        appointment_time: time,
        reference_code: reference,
        qr_payload: qrPayload,
        status: "confirmed",
      });
      if (error) throw error;

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 320,
        color: { dark: "#3a2a10", light: "#fdf6e3" },
      });

      setConfirmation({
        reference,
        clinicName: selected.name,
        address: selected.address,
        department,
        date,
        time,
        qrDataUrl,
      });

      // Bump the local count so UI reflects new booking
      setClinics((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, bookedToday: c.bookedToday + 1 } : c)),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create booking.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <HieroFrame className="pb-16">
        <div className="mx-auto max-w-md px-6 pt-6">
          <TopBar />
          <div className="mt-4 rounded-2xl border-2 border-[oklch(0.72_0.14_75)] bg-white/80 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-[oklch(0.45_0.14_155)]">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="font-display text-xl font-bold uppercase tracking-wider">
                Booking Confirmed
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan this QR at the clinic reception. It's unique to this visit.
            </p>

            <div className="mt-4 flex justify-center">
              <img
                src={confirmation.qrDataUrl}
                alt="Booking QR code"
                className="h-64 w-64 rounded-lg border-4 border-[oklch(0.72_0.14_75)] shadow-lg"
              />
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
              <Row label="Reference" value={confirmation.reference} mono />
              <Row label="Patient" value={fullName || "Patient"} />
              <Row label="Clinic" value={confirmation.clinicName} />
              <Row label="Address" value={confirmation.address} />
              <Row label="Department" value={confirmation.department} />
              <Row label="Date" value={confirmation.date} />
              <Row label="Time" value={confirmation.time} />
            </dl>

            <div className="mt-5 rounded-lg bg-[oklch(0.95_0.05_85)] p-3 text-xs text-[oklch(0.35_0.1_70)]">
              A notification has been saved to your bookings. Arrive 10 minutes early.
              Clinic hours: 07:00 – 17:00.
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmation(null)}
                className="flex-1 rounded-lg border border-[oklch(0.72_0.14_75)] bg-white px-4 py-2 font-display text-sm uppercase tracking-wider text-[oklch(0.4_0.12_65)]"
              >
                New Booking
              </button>
              <Link
                to="/dashboard"
                className="flex-1 rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 text-center font-display text-sm uppercase tracking-wider text-white shadow"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </HieroFrame>
    );
  }

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-md px-6 pt-6">
        <TopBar />

        <h1 className="mt-3 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          BOOK A VISIT
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Skip the queue — pick a department, a clinic and a time. Get a live QR code.
        </p>

        {/* Location status */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/70 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[oklch(0.55_0.11_155)]" />
            {geoStatus === "locating" && <span>Locating you…</span>}
            {geoStatus === "ready" && coords && (
              <span>
                Located at {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </span>
            )}
            {geoStatus === "denied" && <span>Location unavailable — showing all clinics</span>}
            {geoStatus === "idle" && <span>Preparing location…</span>}
          </div>
          <button
            onClick={() => {
              setGeoStatus("locating");
              navigator.geolocation?.getCurrentPosition(
                (pos) => {
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setGeoStatus("ready");
                },
                () => setGeoStatus("denied"),
              );
            }}
            className="text-[oklch(0.5_0.12_65)]"
            title="Refresh location"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Department */}
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
          Department
        </label>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-[oklch(0.82_0.1_80)] bg-white/90 px-3 py-2 text-sm"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        {/* Date + Time */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              Date
            </label>
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-[oklch(0.82_0.1_80)] bg-white/90 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              Time (07:00–17:00)
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-[oklch(0.82_0.1_80)] bg-white/90 px-3 py-2 text-sm"
            >
              {TIME_SLOTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clinic list */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              Clinics near you
            </h2>
            {loadingClinics && <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.5_0.12_65)]" />}
          </div>
          <div className="mt-2 space-y-2">
            {clinics.map((c) => {
              const full = c.bookedToday >= c.daily_capacity;
              const active = c.id === selectedClinic;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClinic(c.id)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition ${
                    active
                      ? "border-[oklch(0.6_0.15_65)] bg-white shadow-md"
                      : "border-[oklch(0.85_0.08_80)] bg-white/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.12_65)]" />
                      <div>
                        <div className="font-display text-sm font-bold text-[oklch(0.35_0.1_60)]">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{c.address}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {c.distanceKm != null && (
                            <span>{c.distanceKm.toFixed(1)} km away</span>
                          )}
                          <span>
                            {c.bookedToday}/{c.daily_capacity} booked
                          </span>
                          <span>
                            {c.opens_at.slice(0, 5)}–{c.closes_at.slice(0, 5)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {full ? (
                      <span className="rounded-full bg-[oklch(0.55_0.19_25)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Full
                      </span>
                    ) : (
                      <span className="rounded-full bg-[oklch(0.55_0.11_155)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Open
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {!loadingClinics && clinics.length === 0 && (
              <div className="rounded-lg bg-white/70 p-3 text-sm text-muted-foreground">
                No clinics available.
              </div>
            )}
          </div>
        </div>

        {isFull && (
          <div className="mt-3 rounded-lg border border-[oklch(0.7_0.18_25)] bg-[oklch(0.97_0.04_25)] p-3 text-xs text-[oklch(0.45_0.18_25)]">
            Clinic bookings are full. Book a doctor online and chat instead — same price.
            <Link
              to="/messages"
              className="ml-1 font-bold underline"
            >
              Open chat
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 rounded-lg border border-[oklch(0.7_0.18_25)] bg-white p-2 text-xs text-[oklch(0.45_0.18_25)]">
            {errorMsg}
          </div>
        )}

        <button
          disabled={!selected || submitting || isFull}
          onClick={handleBook}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.5_0.12_55)] px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-white shadow-lg disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Booking…
            </>
          ) : (
            <>
              <CalendarClock className="h-4 w-4" /> Book &amp; Generate QR
            </>
          )}
        </button>
      </div>
    </HieroFrame>
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
      <div className="h-9 w-9" />
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