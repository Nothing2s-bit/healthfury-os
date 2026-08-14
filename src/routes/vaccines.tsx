import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { Syringe, Loader2, CalendarClock, Snowflake } from "lucide-react";

export const Route = createFileRoute("/vaccines")({
  head: () => ({
    meta: [
      { title: "Vaccine Register & Cold Chain — HealthFury" },
      {
        name: "description",
        content:
          "Vaccine stock list with doses delivered, used and left, cold-chain storage temperatures and campaign schedule.",
      },
      { property: "og:title", content: "Vaccine Register — HealthFury" },
      {
        property: "og:description",
        content: "Live vaccine stock counter, movement log and immunisation campaign schedule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VaccinesPage,
});

type Vaccine = {
  id: string;
  name: string;
  manufacturer: string | null;
  target_disease: string;
  doses_delivered: number;
  doses_used: number;
  doses_on_hand: number;
  reorder_level: number;
  storage_temp: string;
  batch_no: string | null;
  expiry_date: string | null;
  next_campaign_date: string | null;
  location: string | null;
};

type Movement = {
  id: string;
  vaccine_id: string;
  kind: string;
  quantity: number;
  occurred_at: string;
  scheduled_for: string | null;
  location: string | null;
  actor_name: string | null;
  note: string | null;
};

const STAFF_ROLES = ["doctor", "nurse", "admin", "storage_manager", "minister"];

function VaccinesPage() {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    vaccine_id: "",
    kind: "delivery",
    quantity: "",
    location: "",
    scheduled_for: "",
    note: "",
  });

  const isStaff = !!roles?.some((r) => STAFF_ROLES.includes(r));
  const canManage = !!roles?.some((r) => r === "admin" || r === "storage_manager");

  const load = useCallback(async () => {
    const [{ data: v }, { data: m }] = await Promise.all([
      supabase.from("vaccines").select("*").order("name"),
      supabase
        .from("vaccine_movements")
        .select("id,vaccine_id,kind,quantity,occurred_at,scheduled_for,location,actor_name,note")
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);
    setVaccines((v ?? []) as Vaccine[]);
    setMovements((m ?? []) as Movement[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setRoles([]);
        setLoading(false);
        return;
      }
      const [{ data: r }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
      ]);
      if (cancelled) return;
      setStaffName(prof?.full_name ?? "");
      const list = (r ?? []).map((x) => x.role as string);
      setRoles(list);
      if (list.some((role) => STAFF_ROLES.includes(role))) await load();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel("vaccines-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "vaccines" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "vaccine_movements" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, load]);

  async function logMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const vac = vaccines.find((v) => v.id === form.vaccine_id);
    const qty = Number(form.quantity);
    if (!vac || !Number.isFinite(qty) || qty <= 0) {
      setMsg("Pick a vaccine and a valid dose count.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("vaccine_movements").insert({
      vaccine_id: vac.id,
      kind: form.kind,
      quantity: qty,
      scheduled_for: form.scheduled_for || null,
      location: form.location || vac.location,
      actor_id: userId,
      actor_name: staffName || "Staff member",
      note: form.note || null,
    });
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    const patch: Partial<Vaccine> = {};
    if (form.kind === "delivery") {
      patch.doses_delivered = vac.doses_delivered + qty;
      patch.doses_on_hand = vac.doses_on_hand + qty;
    } else if (form.kind === "usage") {
      patch.doses_used = vac.doses_used + qty;
      patch.doses_on_hand = Math.max(0, vac.doses_on_hand - qty);
    } else if (form.kind === "wastage") {
      patch.doses_on_hand = Math.max(0, vac.doses_on_hand - qty);
    } else if (form.kind === "campaign" && form.scheduled_for) {
      patch.next_campaign_date = form.scheduled_for;
    }
    if (Object.keys(patch).length) {
      await supabase.from("vaccines").update(patch).eq("id", vac.id);
    }

    setForm({ vaccine_id: "", kind: "delivery", quantity: "", location: "", scheduled_for: "", note: "" });
    setMsg("Movement recorded.");
    setSaving(false);
    load();
  }

  if (loading) {
    return (
      <HieroFrame>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[oklch(0.6_0.15_65)]" />
        </div>
      </HieroFrame>
    );
  }

  if (!isStaff) {
    return (
      <HieroFrame>
        <div className="mx-auto max-w-md px-6 pt-10 text-center">
          <AnkhLogo size={48} />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-wider text-gold-gradient">
            VACCINE REGISTER
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The vaccine register and cold-chain log are restricted to health staff.
          </p>
          <Link
            to="/register"
            search={{ role: "patient" }}
            className="mt-5 inline-block rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-5 py-2 font-display text-sm uppercase tracking-wider text-white shadow"
          >
            Sign in as staff
          </Link>
        </div>
      </HieroFrame>
    );
  }

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-sm text-[oklch(0.5_0.12_65)]">
            ‹ Back
          </Link>
          <AnkhLogo size={40} />
          <span className="w-10" />
        </div>

        <h1 className="mt-3 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          VACCINE REGISTER
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Available stock, cold-chain temperature, campaign dates and a manual delivered / used /
          left counter.
        </p>

        <ul className="mt-5 space-y-2">
          {vaccines.map((v) => {
            const low = v.doses_on_hand <= v.reorder_level;
            return (
              <li
                key={v.id}
                className="rounded-xl border-2 border-[oklch(0.85_0.08_82)] bg-white/85 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.35_0.1_65)]">
                    {v.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-white ${
                      low ? "bg-[oklch(0.5_0.19_25)]" : "bg-[oklch(0.5_0.11_155)]"
                    }`}
                  >
                    {low ? "Reorder" : "In stock"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Protects against {v.target_disease}
                  {v.manufacturer ? ` · ${v.manufacturer}` : ""}
                  {v.batch_no ? ` · batch ${v.batch_no}` : ""}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <Counter label="Delivered" value={v.doses_delivered} />
                  <Counter label="Used" value={v.doses_used} />
                  <Counter label="Left" value={v.doses_on_hand} highlight={low} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Snowflake className="h-3 w-3" /> {v.storage_temp}
                  </span>
                  {v.expiry_date && <span>Expires {v.expiry_date}</span>}
                  {v.next_campaign_date && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" /> Campaign {v.next_campaign_date}
                    </span>
                  )}
                  {v.location && <span>{v.location}</span>}
                </div>
              </li>
            );
          })}
        </ul>

        {canManage && (
          <section className="mt-6 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              <Syringe className="h-4 w-4" /> Manual counter
            </h2>
            <form onSubmit={logMovement} className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={form.vaccine_id}
                onChange={(e) => setForm({ ...form, vaccine_id: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Select vaccine…</option>
                {vaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              >
                <option value="delivery">Doses delivered</option>
                <option value="usage">Doses administered</option>
                <option value="wastage">Doses wasted</option>
                <option value="campaign">Schedule campaign</option>
              </select>
              <input
                type="number"
                min={1}
                placeholder="Number of doses"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.scheduled_for}
                onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                placeholder="Location / facility"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <button
                disabled={saving}
                className="rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60 sm:col-span-2"
              >
                {saving ? "Saving…" : "Record movement"}
              </button>
            </form>
            {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
          </section>
        )}

        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <CalendarClock className="h-4 w-4" /> Movement & implementation log
          </h2>
          <ul className="mt-2 space-y-2">
            {movements.map((m) => {
              const vac = vaccines.find((v) => v.id === m.vaccine_id);
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-[oklch(0.85_0.08_82)] bg-white/80 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-semibold">
                      {m.quantity} dose(s) — {vac?.name ?? "Vaccine"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.occurred_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="uppercase">{m.kind}</span>
                    {m.location ? ` · ${m.location}` : ""}
                    {m.scheduled_for ? ` · scheduled ${m.scheduled_for}` : ""}
                    {m.actor_name ? ` · by ${m.actor_name}` : ""}
                  </p>
                  {m.note && <p className="text-xs italic text-muted-foreground">{m.note}</p>}
                </li>
              );
            })}
            {movements.length === 0 && (
              <li className="text-xs text-muted-foreground">No vaccine movements recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    </HieroFrame>
  );
}

function Counter({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-[oklch(0.88_0.06_82)] bg-[oklch(0.98_0.02_85)] py-1.5">
      <div
        className={`font-display text-lg font-bold ${
          highlight ? "text-[oklch(0.5_0.19_25)]" : "text-[oklch(0.45_0.13_70)]"
        }`}
      >
        {value}
      </div>
      <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
