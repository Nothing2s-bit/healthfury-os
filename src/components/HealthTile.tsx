import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

// Circular metallic tile with gold ring, matching the mockup buttons.
export function HealthTile({
  icon: Icon,
  label,
  to,
  variant = "gold",
  accent,
}: {
  icon: LucideIcon;
  label: string;
  to?: string;
  variant?: "gold" | "silver";
  accent?: "red" | "green" | "gold";
}) {
  const ringClass = variant === "silver" ? "ring-silver" : "ring-gold";
  const iconColor =
    accent === "red"
      ? "text-[oklch(0.5_0.19_25)]"
      : accent === "green"
      ? "text-[oklch(0.55_0.11_155)]"
      : "text-[oklch(0.6_0.15_65)]";

  const inner = (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`tile-glow ${ringClass} relative flex h-16 w-16 items-center justify-center rounded-full transition-transform active:scale-95 sm:h-20 sm:w-20`}
      >
        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${iconColor}`} strokeWidth={2} />
      </div>
      <span className="text-center font-display text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.35_0.06_60)] sm:text-xs">
        {label}
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  }
  return <button type="button" className="block">{inner}</button>;
}