import { AnkhLogo } from "@/components/AnkhLogo";

export function HealthFuryBadge() {
  return (
    <a
      href="/"
      aria-label="HealthFury OS"
      className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.14_75)] bg-[oklch(0.98_0.02_85_/_0.92)] px-2.5 py-1 shadow-md backdrop-blur"
    >
      <AnkhLogo size={16} />
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gold-gradient">
        Health-Fury
      </span>
    </a>
  );
}
