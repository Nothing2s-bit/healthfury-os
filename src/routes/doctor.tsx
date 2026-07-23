import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope,
  Video,
  Pill,
  FlaskConical,
  ClipboardList,
  CalendarDays,
  MessageCircle,
  Activity,
  UserRound,
  Search,
} from "lucide-react";
import { Heart, Footprints, Moon, Siren, Building2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { HealthTile } from "@/components/HealthTile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Portal — HealthFury 2.0" },
      { name: "description", content: "The HealthFury doctor portal: consult patients, e-prescribe, review labs, and manage records." },
      { property: "og:title", content: "Doctor Portal — HealthFury 2.0" },
      { property: "og:description", content: "Consult, prescribe, review labs and patient history from one HealthFury workspace." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DoctorPortal,
});

const tools = [
  { icon: Video, label: "Consult", to: "/chat", accent: "gold" as const },
  { icon: Pill, label: "Prescribe", accent: "gold" as const },
  { icon: FlaskConical, label: "Lab Results", accent: "gold" as const },
  { icon: ClipboardList, label: "History", accent: "red" as const },
  { icon: CalendarDays, label: "Schedule", accent: "gold" as const },
  { icon: MessageCircle, label: "Messages", to: "/chat", accent: "gold" as const },
  { icon: Activity, label: "Vitals", accent: "red" as const },
  { icon: Stethoscope, label: "Referrals", accent: "gold" as const },
];

const queue = [
  { name: "Amara Okafor", reason: "Fever · 3 days", time: "09:20", status: "waiting" },
  { name: "Sipho Dlamini", reason: "Follow-up · BP", time: "09:40", status: "in-room" },
  { name: "Lerato Mokoena", reason: "Tele-consult", time: "10:00", status: "waiting" },
  { name: "Kwame Mensah", reason: "Lab review", time: "10:20", status: "scheduled" },
];

type Patient = {
  mrn: string;
  name: string;
  age: number;
  sex: "F" | "M";
  condition: string;
  status: "stable" | "monitor" | "critical";
  vitals: { bp: string; hr: string; temp: string; spo2: string };
  allergies: string[];
  medications: string[];
  lastVisit: string;
  notes: string;
};

const patients: Patient[] = [
  {
    mrn: "HF-10231",
    name: "Amara Okafor",
    age: 34,
    sex: "F",
    condition: "Acute febrile illness",
    status: "monitor",
    vitals: { bp: "118/76", hr: "96", temp: "38.7°C", spo2: "98%" },
    allergies: ["Penicillin"],
    medications: ["Paracetamol 500mg"],
    lastVisit: "18 Jul 2026",
    notes: "Fever x3 days, no travel history. Malaria RDT pending.",
  },
  {
    mrn: "HF-10874",
    name: "Sipho Dlamini",
    age: 58,
    sex: "M",
    condition: "Hypertension · Stage 2",
    status: "monitor",
    vitals: { bp: "158/98", hr: "82", temp: "36.6°C", spo2: "97%" },
    allergies: [],
    medications: ["Amlodipine 10mg", "HCTZ 25mg"],
    lastVisit: "10 Jul 2026",
    notes: "Follow-up for BP control. Reports adherence, mild ankle oedema.",
  },
  {
    mrn: "HF-11290",
    name: "Lerato Mokoena",
    age: 27,
    sex: "F",
    condition: "Migraine w/ aura",
    status: "stable",
    vitals: { bp: "112/70", hr: "74", temp: "36.8°C", spo2: "99%" },
    allergies: ["Sulfa"],
    medications: ["Sumatriptan PRN"],
    lastVisit: "02 Jul 2026",
    notes: "Tele-consult requested. Frequency increased to 3x/week.",
  },
  {
    mrn: "HF-11455",
    name: "Kwame Mensah",
    age: 46,
    sex: "M",
    condition: "Type 2 Diabetes",
    status: "stable",
    vitals: { bp: "124/80", hr: "78", temp: "36.5°C", spo2: "98%" },
    allergies: [],
    medications: ["Metformin 1g BD"],
    lastVisit: "20 Jul 2026",
    notes: "HbA1c 7.2% — improving. Review lipid panel today.",
  },
  {
    mrn: "HF-11902",
    name: "Naledi Khumalo",
    age: 8,
    sex: "F",
    condition: "Asthma exacerbation",
    status: "critical",
    vitals: { bp: "104/64", hr: "128", temp: "37.4°C", spo2: "91%" },
    allergies: ["Aspirin"],
    medications: ["Salbutamol inhaler", "Fluticasone"],
    lastVisit: "21 Jul 2026",
    notes: "SpO2 dropping. Nebulise and reassess in 20 min.",
  },
  {
    mrn: "HF-12044",
    name: "Thabo Nkosi",
    age: 41,
    sex: "M",
    condition: "Lower back pain",
    status: "stable",
    vitals: { bp: "126/82", hr: "76", temp: "36.7°C", spo2: "99%" },
    allergies: [],
    medications: ["Ibuprofen 400mg"],
    lastVisit: "15 Jul 2026",
    notes: "Mechanical LBP. Physio referral pending.",
  },
];

function DoctorPortal() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.condition.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-md px-6 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
            aria-label="Back to dashboard"
          >
            ‹
          </Link>
          <AnkhLogo size={44} />
          <div className="h-9 w-9" />
        </div>

        {/* Gold title bar */}
        <div className="mt-4 rounded-md bg-gold-bar px-4 py-2 text-center">
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.25em] text-[oklch(0.22_0.06_45)]">
            Doctor Portal
          </h1>
        </div>

        {/* Clinician card */}
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/70 p-3 shadow-sm">
          <div className="ring-gold flex h-12 w-12 items-center justify-center rounded-full bg-white">
            <UserRound className="h-6 w-6 text-[oklch(0.6_0.15_65)]" />
          </div>
          <div className="flex-1">
            <div className="font-display text-sm font-semibold uppercase tracking-wider text-[oklch(0.25_0.06_50)]">
              Dr. N. Sithole
            </div>
            <div className="text-xs italic text-muted-foreground">
              General Practice · On duty
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold text-[oklch(0.5_0.19_25)]">4</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">in queue</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <div className="flex items-center gap-2 rounded-full border border-[oklch(0.82_0.1_80)] bg-white/80 px-4 py-2 shadow-sm">
            <Search className="h-4 w-4 text-[oklch(0.6_0.15_65)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search patient, MRN, or condition"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSelected(null);
                }}
                className="text-xs text-muted-foreground hover:text-[oklch(0.5_0.19_25)]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {query && !selected && (
            <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[oklch(0.85_0.08_82)] bg-white shadow-lg">
              {results.length === 0 ? (
                <li className="px-3 py-3 text-center text-xs italic text-muted-foreground">
                  No patients match "{query}"
                </li>
              ) : (
                results.map((p) => (
                  <li key={p.mrn}>
                    <button
                      onClick={() => setSelected(p)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[oklch(0.97_0.03_85)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm font-semibold uppercase tracking-wide text-[oklch(0.25_0.06_50)]">
                          {p.name}
                        </div>
                        <div className="truncate text-[11px] italic text-muted-foreground">
                          {p.mrn} · {p.condition}
                        </div>
                      </div>
                      <StatusPill status={statusToPill(p.status)} />
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {selected && <PatientCard patient={selected} onClose={() => setSelected(null)} />}

        {/* Tool grid */}
        <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5">
          {tools.map((t) => (
            <HealthTile key={t.label} icon={t.icon} label={t.label} to={t.to} accent={t.accent} />
          ))}
        </div>

        {/* Queue */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-[oklch(0.35_0.06_60)]">
              Today's Queue
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              22 Jul
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {queue.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between rounded-md border border-[oklch(0.85_0.08_82)] bg-white/80 px-3 py-2 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-semibold uppercase tracking-wide text-[oklch(0.25_0.06_50)]">
                    {p.name}
                  </div>
                  <div className="truncate text-xs italic text-muted-foreground">{p.reason}</div>
                </div>
                <div className="ml-3 flex flex-col items-end">
                  <span className="font-display text-sm font-bold text-[oklch(0.6_0.15_65)]">{p.time}</span>
                  <StatusPill status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center text-xs italic text-muted-foreground">
          Clinical decisions remain with the attending clinician.
        </p>

        <ControlScreen />
      </div>
    </HieroFrame>
  );
}

function ControlScreen() {
  type Metrics = {
    patients: number; nurses: number; staff: number;
    flu_cases: number; tb_cases: number;
    ems_active: number; ems_eta_min: number;
    panado_units: number; amoxil_units: number;
    icu_load: number; er_wait_min: number;
    updated_at?: string;
  };
  const [m, setM] = useState<Metrics | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("control_metrics")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setM(data as Metrics);
      });

    const channel = supabase
      .channel("control_metrics_live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "control_metrics" },
        (payload) => setM(payload.new as Metrics),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const counts = { patients: m?.patients ?? 0, nurses: m?.nurses ?? 0, staff: m?.staff ?? 0 };
  const total = counts.patients + counts.nurses + counts.staff;
  const staff = [
    { label: "Patients", value: counts.patients, icon: Heart },
    { label: "Nurses", value: counts.nurses, icon: Footprints },
    { label: "Staff", value: counts.staff, icon: Moon },
  ];
  return (
    <section className="mt-10">
      <div className="rounded-md bg-gold-bar px-4 py-2 text-center">
        <h2 className="font-display text-base font-bold uppercase tracking-[0.25em] text-[oklch(0.22_0.06_45)]">
          Control Screen
        </h2>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-widest text-[oklch(0.3_0.06_50)]">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[oklch(0.65_0.18_150)] animate-pulse" : "bg-muted-foreground/50"}`} />
          {live ? "Realtime · streaming" : "Connecting…"}
        </div>
      </div>

      {/* Big vitality-style ring */}
      <div className="mt-5 flex justify-center">
        <div
          className="ring-gold relative flex h-64 w-64 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-12px_oklch(0.6_0.15_65/0.55)]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, white 55%, oklch(0.95 0.06 82) 56%, oklch(0.85 0.11 78) 62%, oklch(0.72 0.14 75) 68%, oklch(0.95 0.06 82) 74%, white 76%)",
          }}
        >
          <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white text-center ring-1 ring-[oklch(0.82_0.1_80)]">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Live Facility
            </div>
            <div className="font-display text-4xl font-bold text-[oklch(0.22_0.06_45)]">
              {total}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[oklch(0.5_0.19_25)]">
              Total on site · live
            </div>
          </div>

          {/* Stat feet under numeric */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-4 text-center">
            {staff.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <s.icon className="h-3.5 w-3.5 text-[oklch(0.6_0.15_65)]" />
                <span className="font-display text-xs font-bold text-[oklch(0.22_0.06_45)]">
                  {s.value}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Four square panels */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Panel title="Disease Monitor" icon={ShieldAlert} accent="red">
          <Row label="Flu" value={`${m?.flu_cases ?? 0} cases`} />
          <Row label="TB" value={`${m?.tb_cases ?? 0} active`} />
          <Row label="COVID-19" value={(m?.flu_cases ?? 0) > 25 ? "Moderate" : "Low"} />
        </Panel>
        <Panel title="EMS Dispatch" icon={Siren} accent="red">
          <Row label="Units active" value={`${m?.ems_active ?? 0} / 12`} />
          <Row label="Avg ETA" value={`${m?.ems_eta_min ?? 0} min`} />
          <Row label="En route" value={`${Math.max(0, (m?.ems_active ?? 0) - 2)}`} />
        </Panel>
        <Panel title="Pharmacy Stats" icon={Pill} accent="gold">
          <Row label="Panado" value={`${m?.panado_units ?? 0} units`} />
          <Row label="Amoxil" value={`${m?.amoxil_units ?? 0} units`} />
          <Row label="Insulin" value={(m?.amoxil_units ?? 0) <= 40 ? `Low · ${m?.amoxil_units ?? 0}` : "OK"} />
        </Panel>
        <Panel title="Facility Load" icon={Building2} accent="gold">
          <Row label="ICU load" value={`${m?.icu_load ?? 0}%`} />
          <Row label="ER wait" value={`${m?.er_wait_min ?? 0} min`} />
          <Row label="Theatre" value={`${Math.round(((m?.icu_load ?? 0) / 25))} in use`} />
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: typeof Pill;
  accent: "red" | "gold";
  children: React.ReactNode;
}) {
  const iconColor =
    accent === "red" ? "text-[oklch(0.5_0.19_25)]" : "text-[oklch(0.6_0.15_65)]";
  return (
    <div className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/85 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 border-b border-[oklch(0.9_0.06_82)] pb-1.5">
        <div className="ring-gold flex h-7 w-7 items-center justify-center rounded-full bg-white">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <div className="font-display text-[11px] font-bold uppercase tracking-widest text-[oklch(0.22_0.06_45)]">
          {title}
        </div>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-[oklch(0.9_0.06_82)] py-0.5 text-[11px] last:border-0">
      <span className="text-[oklch(0.35_0.06_60)]">{label}</span>
      <span className="font-display font-semibold text-[oklch(0.22_0.06_45)]">
        {value}
      </span>
    </div>
  );
}

function statusToPill(s: Patient["status"]): string {
  if (s === "critical") return "waiting";
  if (s === "monitor") return "in-room";
  return "scheduled";
}

function PatientCard({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const statusStyles: Record<Patient["status"], string> = {
    stable: "bg-[oklch(0.95_0.06_155)] text-[oklch(0.35_0.11_155)] ring-[oklch(0.6_0.11_155)]",
    monitor: "bg-[oklch(0.95_0.08_85)] text-[oklch(0.4_0.12_60)] ring-[oklch(0.75_0.14_75)]",
    critical: "bg-[oklch(0.94_0.08_25)] text-[oklch(0.4_0.19_25)] ring-[oklch(0.6_0.19_25)]",
  };
  const statusLabel: Record<Patient["status"], string> = {
    stable: "Stable",
    monitor: "Monitor",
    critical: "Critical",
  };
  return (
    <div className="mt-4 rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/90 p-4 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base font-bold uppercase tracking-wider text-[oklch(0.22_0.06_45)]">
            {patient.name}
          </div>
          <div className="text-[11px] italic text-muted-foreground">
            {patient.mrn} · {patient.age}{patient.sex} · Last visit {patient.lastVisit}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ring-1 ${statusStyles[patient.status]}`}
          >
            {statusLabel[patient.status]}
          </span>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-[oklch(0.5_0.19_25)]"
            aria-label="Close patient details"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-[oklch(0.97_0.03_85)] px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Condition</div>
        <div className="font-display text-sm font-semibold text-[oklch(0.25_0.06_50)]">
          {patient.condition}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Vital label="BP" value={patient.vitals.bp} />
        <Vital label="HR" value={patient.vitals.hr} />
        <Vital label="Temp" value={patient.vitals.temp} />
        <Vital label="SpO₂" value={patient.vitals.spo2} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <InfoBlock label="Allergies" items={patient.allergies.length ? patient.allergies : ["None known"]} />
        <InfoBlock label="Medications" items={patient.medications.length ? patient.medications : ["None"]} />
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Clinical notes</div>
        <p className="mt-1 text-xs italic text-[oklch(0.3_0.05_50)]">{patient.notes}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 rounded-md bg-[oklch(0.5_0.19_25)] px-3 py-2 font-display text-xs font-semibold uppercase tracking-widest text-white shadow hover:bg-[oklch(0.45_0.19_25)]">
          Open chart
        </button>
        <button className="flex-1 rounded-md border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 font-display text-xs font-semibold uppercase tracking-widest text-[oklch(0.35_0.06_60)] shadow-sm hover:bg-[oklch(0.97_0.03_85)]">
          Start consult
        </button>
      </div>
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[oklch(0.85_0.08_82)] bg-white px-2 py-1 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm font-bold text-[oklch(0.25_0.06_50)]">{value}</div>
    </div>
  );
}

function InfoBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[oklch(0.85_0.08_82)] bg-white px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((it) => (
          <li key={it} className="text-[11px] text-[oklch(0.3_0.05_50)]">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    waiting: {
      label: "Waiting",
      cls: "bg-[oklch(0.95_0.08_85)] text-[oklch(0.4_0.12_60)] ring-[oklch(0.75_0.14_75)]",
    },
    "in-room": {
      label: "In room",
      cls: "bg-[oklch(0.95_0.06_155)] text-[oklch(0.35_0.11_155)] ring-[oklch(0.6_0.11_155)]",
    },
    scheduled: {
      label: "Scheduled",
      cls: "bg-white text-muted-foreground ring-[oklch(0.85_0.05_80)]",
    },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ring-1 ${s.cls}`}>
      {s.label}
    </span>
  );
}