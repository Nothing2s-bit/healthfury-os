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
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { HealthTile } from "@/components/HealthTile";

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

function DoctorPortal() {
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
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[oklch(0.82_0.1_80)] bg-white/80 px-4 py-2 shadow-sm">
          <Search className="h-4 w-4 text-[oklch(0.6_0.15_65)]" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search patient, MRN, or condition"
          />
        </div>

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
      </div>
    </HieroFrame>
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