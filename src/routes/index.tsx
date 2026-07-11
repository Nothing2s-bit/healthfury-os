import { createFileRoute, Link } from "@tanstack/react-router";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  return (
    <HieroFrame>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        {/* Light ray */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, oklch(1 0 0 / 0.9) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <AnkhLogo size={160} className="drop-shadow-[0_6px_12px_rgba(120,80,20,0.35)]" />

          <h1 className="mt-8 font-display text-5xl font-bold tracking-wide text-gold-gradient sm:text-6xl">
            HEALTHFURY
          </h1>
          <div className="mt-1 font-display text-2xl font-bold text-gold-gradient sm:text-3xl">
            2.0
          </div>

          <p className="mt-6 max-w-xs font-display text-sm font-semibold uppercase tracking-[0.2em] text-[oklch(0.5_0.19_25)]">
            National Health<br />Operating System
          </p>

          <Link
            to="/dashboard"
            className="mt-12 inline-flex items-center justify-center rounded-full border-2 border-[oklch(0.72_0.14_75)] bg-gradient-to-b from-[oklch(0.9_0.11_88)] to-[oklch(0.65_0.15_68)] px-10 py-3 font-display text-sm font-bold uppercase tracking-widest text-[oklch(0.25_0.06_50)] shadow-lg transition active:scale-95"
          >
            Enter
          </Link>

          <p className="mt-8 text-xs italic text-muted-foreground">
            One system. Every hospital. Every patient.
          </p>
        </div>
      </div>
    </HieroFrame>
  );
}
