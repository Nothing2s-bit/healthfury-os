import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { Package, Truck, AlertTriangle, Loader2, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Medical Stock Counter — HealthFury" },
      {
        name: "description",
        content:
          "Live medical stock levels and delivery log: how many units were delivered, when, where and by whom.",
      },
      { property: "og:title", content: "Medical Stock Counter — HealthFury" },
      {
        property: "og:description",
        content: "Real-time stock levels and delivery history for clinics and hospital stores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockPage,
});

type StockItem = {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  location: string | null;
  department: string;
  updated_at: string;
};

type Delivery = {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  delivered_at: string;
  destination: string;
  supplier: string | null;
  received_by_name: string | null;
  note: string | null;
};

const STAFF_ROLES = ["doctor", "nurse", "admin", "storage_manager", "minister"];
const DEPARTMENTS = ["Pharmacy", "Laboratory", "Theatre", "Maternity", "EMS", "General Stores"];
const MEDICINE_CATEGORIES = ["medicine"];

function StockPage() {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [form, setForm] = useState({ itemId: "", quantity: "", supplier: "", destination: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dept, setDept] = useState<string>("Pharmacy");
  const [kind, setKind] = useState<"medicine" | "tools">("medicine");

  const canManage = !!roles?.some((r) => r === "admin" || r === "storage_manager");
  const isStaff = !!roles?.some((r) => STAFF_ROLES.includes(r));

  const load = useCallback(async () => {
    const [{ data: stock }, { data: deliv }] = await Promise.all([
      supabase.from("medical_stock").select("*").order("item_name"),
      supabase
        .from("stock_deliveries")
        .select("id,item_name,quantity,unit,delivered_at,destination,supplier,received_by_name,note")
        .order("delivered_at", { ascending: false })
        .limit(50),
    ]);
    setItems((stock ?? []) as StockItem[]);
    setDeliveries((deliv ?? []) as Delivery[]);
    setLoading(false);
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
      else setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Live updates
  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel("stock-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "medical_stock" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_deliveries" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, load]);

  const lowStock = useMemo(
    () => items.filter((i) => i.quantity_on_hand <= i.reorder_level),
    [items],
  );

  const deptItems = useMemo(() => items.filter((i) => i.department === dept), [items, dept]);
  const medicines = useMemo(
    () => deptItems.filter((i) => MEDICINE_CATEGORIES.includes(i.category)),
    [deptItems],
  );
  const tools = useMemo(
    () => deptItems.filter((i) => !MEDICINE_CATEGORIES.includes(i.category)),
    [deptItems],
  );
  const visible = kind === "medicine" ? medicines : tools;

  async function recordDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const item = items.find((i) => i.id === form.itemId);
    const qty = Number(form.quantity);
    if (!item || !Number.isFinite(qty) || qty <= 0) {
      setMsg("Pick an item and a valid quantity.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("stock_deliveries").insert({
      stock_item_id: item.id,
      item_name: item.item_name,
      quantity: qty,
      unit: item.unit,
      destination: form.destination || item.location || "Central Store",
      supplier: form.supplier || null,
      received_by: userId,
      received_by_name: staffName || "Staff member",
      note: form.note || null,
    });
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }
    await supabase
      .from("medical_stock")
      .update({ quantity_on_hand: item.quantity_on_hand + qty })
      .eq("id", item.id);
    setForm({ itemId: "", quantity: "", supplier: "", destination: "", note: "" });
    setMsg("Delivery recorded.");
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
            STOCK COUNTER
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This screen is restricted to doctors, nurses, storage managers, admins and the Minister
            of Health.
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
          MEDICAL STOCK COUNTER
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Live levels, reorder alerts and a full delivery log — who delivered what, when and where.
        </p>

        {lowStock.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[oklch(0.65_0.19_25)] bg-[oklch(0.97_0.04_30)] p-3 text-xs text-[oklch(0.42_0.16_25)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{lowStock.length}</strong> item(s) at or below reorder level:{" "}
              {lowStock.map((i) => i.item_name).join(", ")}
            </span>
          </div>
        )}

        <section className="mt-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <Package className="h-4 w-4" /> Stock on hand
          </h2>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEPARTMENTS.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full border px-3 py-1 font-display text-[10px] uppercase tracking-wider ${
                  dept === d
                    ? "border-[oklch(0.6_0.15_65)] bg-[oklch(0.95_0.06_85)] text-[oklch(0.4_0.12_65)]"
                    : "border-[oklch(0.86_0.06_82)] text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5">
            {(
              [
                ["medicine", `Medicines (${medicines.length})`],
                ["tools", `Tools & consumables (${tools.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border-2 px-3 py-1.5 font-display text-[11px] uppercase tracking-wider ${
                  kind === k
                    ? "border-[oklch(0.72_0.14_75)] bg-white text-[oklch(0.4_0.12_65)] shadow"
                    : "border-transparent bg-white/50 text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2 overflow-x-auto rounded-xl border-2 border-[oklch(0.82_0.1_80)] bg-white/80">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[oklch(0.95_0.05_85)] font-display text-[11px] uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2 text-right">On hand</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => {
                  const low = i.quantity_on_hand <= i.reorder_level;
                  return (
                    <tr key={i.id} className="border-t border-[oklch(0.9_0.05_85)]">
                      <td className="px-3 py-2 font-medium">{i.item_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.category}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.location ?? "—"}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          low ? "text-[oklch(0.5_0.19_25)]" : "text-[oklch(0.45_0.14_155)]"
                        }`}
                      >
                        {i.quantity_on_hand} {i.unit}
                        {low && <span className="ml-1 text-[10px] uppercase">low</span>}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-xs text-muted-foreground">
                      No {kind === "medicine" ? "medicines" : "tools or consumables"} in {dept}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="mt-6 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
              <PlusCircle className="h-4 w-4" /> Record a delivery
            </h2>
            <form onSubmit={recordDelivery} className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Select item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                placeholder="Quantity delivered"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                placeholder="Supplier / delivered by"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                placeholder="Destination (store / clinic)"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
              <input
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm sm:col-span-2"
              />
              <button
                disabled={saving}
                className="rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60 sm:col-span-2"
              >
                {saving ? "Saving…" : "Log delivery"}
              </button>
            </form>
            {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
          </section>
        )}

        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <Truck className="h-4 w-4" /> Delivery log
          </h2>
          <ul className="mt-2 space-y-2">
            {deliveries.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-[oklch(0.85_0.08_82)] bg-white/80 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-semibold">
                    {d.quantity} {d.unit} — {d.item_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.delivered_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  To <strong>{d.destination}</strong>
                  {d.supplier ? ` · from ${d.supplier}` : ""}
                  {d.received_by_name ? ` · received by ${d.received_by_name}` : ""}
                </p>
                {d.note && <p className="text-xs italic text-muted-foreground">{d.note}</p>}
              </li>
            ))}
            {deliveries.length === 0 && (
              <li className="text-xs text-muted-foreground">No deliveries recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    </HieroFrame>
  );
}