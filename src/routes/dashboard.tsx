import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope,
  UserRound,
  ShieldCheck,
  Package,
  Users,
  Syringe,
  MessageCircle,
  Siren,
  FlaskConical,
  Video,
  Sparkles,
  Home,
  MessagesSquare,
  FileBarChart,
  Pill,
  ScanLine,
  Flag,
} from "lucide-react";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { HealthTile } from "@/components/HealthTile";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HealthFury 2.0" },
      { name: "description", content: "Your HealthFury command center: doctor, pharmacy, emergency, records, AI triage." },
    ],
  }),
  component: Dashboard,
});

const tiles = [
  { icon: UserRound, label: "Nurse", to: "/register?role=nurse", accent: "red" as const },
  { icon: Stethoscope, label: "Doctor", to: "/register?role=doctor", accent: "red" as const },
  { icon: ShieldCheck, label: "Admin", to: "/admin", accent: "gold" as const },
  { icon: ScanLine, label: "Verify QR", to: "/admin", accent: "gold" as const },
  { icon: Package, label: "Stock", to: "/stock", accent: "red" as const },
  { icon: Users, label: "Booking", to: "/booking", accent: "gold" as const },
  { icon: FileBarChart, label: "Files", to: "/patients", accent: "gold" as const },
  { icon: Pill, label: "Pharmacy", to: "/stock", accent: "gold" as const },
  { icon: Syringe, label: "Vaccines", to: "/vaccines", accent: "gold" as const },
  { icon: MessageCircle, label: "Chat", to: "/messages", accent: "gold" as const },
  { icon: Siren, label: "Emergency", to: "/emergency", accent: "red" as const },
  { icon: FlaskConical, label: "Lab", to: "/lab", accent: "gold" as const },
  { icon: Video, label: "Telemedicine", to: "/messages", accent: "gold" as const },
  { icon: Sparkles, label: "AI TRIAGE", to: "/chat", accent: "gold" as const },
  { icon: Flag, label: "Flag", to: "/flag", accent: "red" as const },
];

function Dashboard() {
  return (
    <HieroFrame className="pb-24">
      <div className="mx-auto max-w-md px-6 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
          >
            ‹
          </Link>
          <AnkhLogo size={44} />
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]">
            ☰
          </button>
        </div>

        <h1 className="mt-3 text-center font-display text-3xl font-bold tracking-wider text-gold-gradient">
          HEALTHFURY
        </h1>

        {/* Radial "health scanner" — decorative for now */}
        <HealthRadial />

        {/* Tile grid — 4 columns × 3 rows to match mockup */}
        <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5">
          {tiles.map((t) => (
            <HealthTile key={t.label} {...t} />
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[oklch(0.82_0.1_80)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={MessagesSquare} label="ChatHub" />
          <NavItem icon={FileBarChart} label="Report" />
        </div>
      </nav>
    </HieroFrame>
  );
}

function NavItem({ icon: Icon, label, active }: { icon: typeof Home; label: string; active?: boolean }) {
  return (
    <button className="flex flex-col items-center gap-0.5">
      <Icon
        className={`h-5 w-5 ${active ? "text-[oklch(0.55_0.11_155)]" : "text-muted-foreground"}`}
      />
      <span
        className={`font-display text-[10px] uppercase tracking-wider ${
          active ? "text-[oklch(0.55_0.11_155)]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function HealthRadial() {
  return (
    <div className="relative mx-auto mt-4 flex h-56 w-56 items-center justify-center">
      {/* Concentric rings */}
      {[100, 80, 60, 40].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border"
          style={{
            width: `${size}%`,
            height: `${size}%`,
            borderColor: i % 2 ? "oklch(0.55 0.11 155 / 0.5)" : "oklch(0.72 0.14 75 / 0.6)",
            borderWidth: i === 3 ? 2 : 1,
          }}
        />
      ))}
      {/* Radial spokes */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          const x1 = 50 + Math.cos(angle) * 20;
          const y1 = 50 + Math.sin(angle) * 20;
          const x2 = 50 + Math.cos(angle) * 48;
          const y2 = 50 + Math.sin(angle) * 48;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="oklch(0.72 0.14 75 / 0.5)"
              strokeWidth="0.3"
            />
          );
        })}
      </svg>
      {/* Center gem — launches the AI health scan */}
      <Link
        to="/scan"
        aria-label="Start AI health scan"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.7_0.2_35)] to-[oklch(0.4_0.18_25)] shadow-[0_0_30px_oklch(0.6_0.2_35_/_0.6)] transition active:scale-95 hover:shadow-[0_0_44px_oklch(0.6_0.2_35_/_0.8)]"
      >
        <span className="absolute inset-1 rounded-full bg-[oklch(0.85_0.15_65)] opacity-40 blur-sm" />
        <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.6_0.2_35_/_0.35)]" />
        <ScanLine className="relative h-6 w-6 text-white" />
      </Link>
      {/* Status badge */}
      <Link
        to="/scan"
        className="absolute -bottom-1 right-6 rounded-full bg-[oklch(0.5_0.19_25)] px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white shadow transition active:scale-95"
      >
        Scan
      </Link>
    </div>
  );
}