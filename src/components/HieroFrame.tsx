import type { ReactNode } from "react";

// Decorative gold frame with faint hieroglyphic border — used to wrap
// every HealthFury screen so it feels like a page from an ancient book.
export function HieroFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative min-h-screen bg-papyrus-texture ${className}`}>
      {/* Outer gold border */}
      <div className="pointer-events-none absolute inset-2 rounded-md border-2 border-[oklch(0.72_0.14_75)]" />
      <div className="pointer-events-none absolute inset-3 rounded-md border border-[oklch(0.82_0.1_80)]" />
      {/* Corner glyphs */}
      {[
        "top-3 left-3",
        "top-3 right-3",
        "bottom-3 left-3",
        "bottom-3 right-3",
      ].map((pos) => (
        <div
          key={pos}
          className={`pointer-events-none absolute h-6 w-6 ${pos} bg-[oklch(0.72_0.14_75)]`}
          style={{
            clipPath:
              "polygon(0 0, 100% 0, 100% 25%, 25% 25%, 25% 100%, 0 100%)",
          }}
        />
      ))}
      {/* Hieroglyphic side strips (subtle) */}
      <div
        className="pointer-events-none absolute inset-y-8 left-3 w-4 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, oklch(0.72 0.14 75) 0 2px, transparent 2px 14px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-8 right-3 w-4 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, oklch(0.72 0.14 75) 0 2px, transparent 2px 14px)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}