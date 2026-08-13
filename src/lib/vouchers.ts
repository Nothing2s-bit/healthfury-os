import { supabase } from "@/integrations/supabase/client";

export type VoucherKind = "booking" | "scan";

export const VOUCHER_PRICE_CENTS: Record<VoucherKind, number> = {
  booking: 500,
  scan: 1500,
};

export const VOUCHER_TITLE: Record<VoucherKind, string> = {
  booking: "Clinic booking voucher",
  scan: "AI health scan voucher",
};

export type Voucher = {
  id: string;
  kind: string;
  amount_cents: number;
  reference: string;
  status: string;
  method: string;
  created_at: string;
};

export function randPrice(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

function voucherRef(kind: VoucherKind) {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${kind === "booking" ? "VB" : "VS"}-${Date.now().toString(36).toUpperCase().slice(-4)}-${rand}`;
}

/** Returns an unused, paid voucher of this kind for the user, if any. */
export async function findPaidVoucher(userId: string, kind: VoucherKind) {
  const { data } = await supabase
    .from("vouchers")
    .select("id,kind,amount_cents,reference,status,method,created_at")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("status", "paid")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Voucher | null) ?? null;
}

export async function purchaseVoucher(userId: string, kind: VoucherKind, method = "card") {
  const { data, error } = await supabase
    .from("vouchers")
    .insert({
      user_id: userId,
      kind,
      amount_cents: VOUCHER_PRICE_CENTS[kind],
      currency: "ZAR",
      reference: voucherRef(kind),
      status: "paid",
      method,
    })
    .select("id,kind,amount_cents,reference,status,method,created_at")
    .single();
  if (error) throw error;
  return data as Voucher;
}

export async function consumeVoucher(voucherId: string, bookingId?: string) {
  await supabase
    .from("vouchers")
    .update({
      status: "used",
      consumed_at: new Date().toISOString(),
      ...(bookingId ? { booking_id: bookingId } : {}),
    })
    .eq("id", voucherId);
}
