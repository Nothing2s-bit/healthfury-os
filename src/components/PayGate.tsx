import { useEffect, useState } from "react";
import { Loader2, Ticket, ShieldCheck } from "lucide-react";
import {
  findPaidVoucher,
  purchaseVoucher,
  randPrice,
  VOUCHER_PRICE_CENTS,
  VOUCHER_TITLE,
  type Voucher,
  type VoucherKind,
} from "@/lib/vouchers";

type Props = {
  kind: VoucherKind;
  userId: string | null;
  voucher: Voucher | null;
  onVoucher: (v: Voucher | null) => void;
  note?: string;
};

const METHODS = [
  { id: "card", label: "Card" },
  { id: "eft", label: "Instant EFT" },
  { id: "cash_voucher", label: "Cash voucher" },
] as const;

export function PayGate({ kind, userId, voucher, onVoucher, note }: Props) {
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<string>("card");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setChecking(false);
        return;
      }
      const existing = await findPaidVoucher(userId, kind);
      if (cancelled) return;
      if (existing) onVoucher(existing);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, kind]);

  async function pay() {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const v = await purchaseVoucher(userId, kind, method);
      onVoucher(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[oklch(0.85_0.08_82)] bg-white/70 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking your vouchers…
      </div>
    );
  }

  if (voucher) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-[oklch(0.6_0.13_155)] bg-[oklch(0.97_0.04_155)] px-3 py-2 text-xs text-[oklch(0.38_0.12_155)]">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          <strong>{randPrice(voucher.amount_cents)}</strong> {VOUCHER_TITLE[kind].toLowerCase()} paid ·{" "}
          <span className="font-mono">{voucher.reference}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
        <Ticket className="h-4 w-4" /> {VOUCHER_TITLE[kind]} — {randPrice(VOUCHER_PRICE_CENTS[kind])}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {note ?? "One voucher covers one use. Pay once, then continue."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-full border px-3 py-1 font-display text-[11px] uppercase tracking-wider ${
              method === m.id
                ? "border-[oklch(0.6_0.15_65)] bg-[oklch(0.95_0.06_85)] text-[oklch(0.4_0.12_65)]"
                : "border-[oklch(0.86_0.06_82)] text-muted-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || !userId}
        onClick={pay}
        className="mt-3 w-full rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60"
      >
        {busy ? "Processing…" : `Pay ${randPrice(VOUCHER_PRICE_CENTS[kind])}`}
      </button>
      {error && <p className="mt-2 text-xs text-[oklch(0.45_0.18_25)]">{error}</p>}
    </div>
  );
}
