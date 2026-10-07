import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, LogIn, LogOut, CalendarCheck, Users, FlaskConical, Package, Flag, FileText, Syringe, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Shift = { id: string; user_id: string; staff_name: string | null; role: string | null; clock_in: string; clock_out: string | null };
type Booking = { id: string; reference_code: string; department: string; appointment_date: string; appointment_time: string; status: string; created_at: string };
type Lab = { id: string; patient_name: string; test_name: string; status: string; result_flag: string | null; created_at: string };
type Patient = { id: string; full_name: string; mrn: string; created_at: string };

const today = () => new Date().toISOString().slice(0, 10);
const t = (iso: string) => new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
const dur = (a: string, b: string | null) => {
  const m = Math.max(0, Math.round(((b ? new Date(b) : new Date()).getTime() - new Date(a).getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export function AdminOverview({ userId }: { userId: string }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState({ todayBookings: 0, checkedIn: 0, pendingLabs: 0, patients: 0, lowStock: 0, openFlags: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [s, b, l, p, tb, ci, pl, pc, st, fl] = await Promise.all([
      supabase.from("staff_shifts").select("*").or(`clock_out.is.null,clock_in.gte.${since}`).order("clock_in", { ascending: false }).limit(40),
      supabase.from("bookings").select("id,reference_code,department,appointment_date,appointment_time,status,created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("lab_orders").select("id,patient_name,test_name,status,result_flag,created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("patient_files").select("id,full_name,mrn,created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("appointment_date", today()),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("appointment_date", today()).not("checked_in_at", "is", null),
      supabase.from("lab_orders").select("id", { count: "exact", head: true }).neq("status", "resulted"),
      supabase.from("patient_files").select("id", { count: "exact", head: true }),
      supabase.from("medical_stock").select("quantity_on_hand,reorder_level"),
      supabase.from("misconduct_reports").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    ]);
    setShifts((s.data ?? []) as Shift[]);
    setBookings((b.data ?? []) as Booking[]);
    setLabs((l.data ?? []) as Lab[]);
    setPatients((p.data ?? []) as Patient[]);
    setStats({
      todayBookings: tb.count ?? 0,
      checkedIn: ci.count ?? 0,
      pendingLabs: pl.count ?? 0,
      patients: pc.count ?? 0,
      lowStock: (st.data ?? []).filter((r) => r.quantity_on_hand <= r.reorder_level).length,
      openFlags: fl.count ?? 0,
    });
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_shifts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_orders" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const myOpen = shifts.find((s) => s.user_id === userId && !s.clock_out);

  async function clockIn() {
    setBusy(true);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const name = (prof as { full_name?: string } | null)?.full_name ?? "Staff";
    await supabase.from("staff_shifts").insert({ user_id: userId, staff_name: name, role: roles?.[0]?.role ?? null });
    await load();
    setBusy(false);
  }
  async function clockOut() {
    if (!myOpen) return;
    setBusy(true);
    await supabase.from("staff_shifts").update({ clock_out: new Date().toISOString() }).eq("id", myOpen.id);
    await load();
    setBusy(false);
  }

  const card = "rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/80 p-3 shadow";
  const h = "mb-2 font-display text-xs font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]";
  const onDuty = shifts.filter((s) => !s.clock_out);

  return (
    <div className="mt-4 space-y-4">
      {/* My shift */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <p className={h}><Clock className="mr-1 inline h-3.5 w-3.5" />My shift</p>
            <p className="text-sm">{myOpen ? `On duty since ${t(myOpen.clock_in)} · ${dur(myOpen.clock_in, null)}` : "You are clocked out"}</p>
          </div>
          {myOpen ? (
            <button disabled={busy} onClick={clockOut} className="flex items-center gap-1 rounded-full bg-[oklch(0.5_0.19_25)] px-4 py-2 text-xs font-bold text-white shadow">
              <LogOut className="h-4 w-4" /> Clock out
            </button>
          ) : (
            <button disabled={busy} onClick={clockIn} className="flex items-center gap-1 rounded-full bg-[oklch(0.55_0.11_155)] px-4 py-2 text-xs font-bold text-white shadow">
              <LogIn className="h-4 w-4" /> Clock in
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Today", stats.todayBookings, "/booking"],
          ["Checked in", stats.checkedIn, "/admin"],
          ["On duty", onDuty.length, "/admin"],
          ["Patients", stats.patients, "/patients"],
          ["Labs pending", stats.pendingLabs, "/lab"],
          ["Low stock", stats.lowStock, "/stock"],
        ].map(([label, value, to]) => (
          <Link key={label as string} to={to as "/lab"} className="rounded-xl border border-[oklch(0.72_0.14_75)] bg-white/80 p-2 text-center shadow-sm">
            <div className="font-display text-xl font-bold text-gold-gradient">{value as number}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label as string}</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold uppercase">
        {[
          [CalendarCheck, "Bookings", "/booking"],
          [FileText, "Files", "/patients"],
          [FlaskConical, "Lab", "/lab"],
          [Package, "Stock", "/stock"],
          [Syringe, "Vaccines", "/vaccines"],
          [MessageCircle, "Chat", "/messages"],
          [Flag, `Flags (${stats.openFlags})`, "/flag"],
          [Users, "Audit", "/audit"],
        ].map(([Icon, label, to]) => {
          const I = Icon as typeof Clock;
          return (
            <Link key={label as string} to={to as "/lab"} className="rounded-lg bg-white/70 p-2 text-[oklch(0.4_0.12_65)] ring-1 ring-[oklch(0.72_0.14_75)]">
              <I className="mx-auto mb-1 h-5 w-5" />
              {label as string}
            </Link>
          );
        })}
      </div>

      {/* Clock log */}
      <div className={card}>
        <p className={h}>Staff clock-in log (24h)</p>
        {shifts.length === 0 && <p className="text-xs text-muted-foreground">No clock-ins yet.</p>}
        {shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b border-[oklch(0.9_0.05_85)] py-1.5 text-xs last:border-0">
            <div>
              <span className="font-semibold">{s.staff_name ?? "Staff"}</span>
              <span className="ml-1 uppercase text-muted-foreground">{s.role}</span>
            </div>
            <div className="text-right">
              <div>{t(s.clock_in)} → {s.clock_out ? t(s.clock_out) : <span className="font-bold text-[oklch(0.55_0.11_155)]">on duty</span>}</div>
              <div className="text-[10px] text-muted-foreground">{dur(s.clock_in, s.clock_out)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className={card}>
        <p className={h}>Recent bookings</p>
        {bookings.length === 0 && <p className="text-xs text-muted-foreground">No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="flex justify-between border-b border-[oklch(0.9_0.05_85)] py-1.5 text-xs last:border-0">
            <span><span className="font-mono font-semibold">{b.reference_code}</span> · {b.department}</span>
            <span className="text-muted-foreground">{b.appointment_date} {b.appointment_time.slice(0, 5)} · {b.status}</span>
          </div>
        ))}
      </div>

      {/* Lab results */}
      <div className={card}>
        <p className={h}>Latest lab orders</p>
        {labs.length === 0 && <p className="text-xs text-muted-foreground">No lab orders yet.</p>}
        {labs.map((l) => (
          <Link key={l.id} to="/lab" className="flex justify-between border-b border-[oklch(0.9_0.05_85)] py-1.5 text-xs last:border-0">
            <span><span className="font-semibold">{l.patient_name}</span> · {l.test_name}</span>
            <span className={l.result_flag === "critical" ? "font-bold text-[oklch(0.5_0.19_25)]" : "text-muted-foreground"}>
              {l.status}{l.result_flag ? ` · ${l.result_flag}` : ""}
            </span>
          </Link>
        ))}
      </div>

      {/* Patient files */}
      <div className={card}>
        <p className={h}>Newest patient files</p>
        {patients.length === 0 && <p className="text-xs text-muted-foreground">No patient files yet.</p>}
        {patients.map((p) => (
          <Link key={p.id} to="/patients" className="flex justify-between border-b border-[oklch(0.9_0.05_85)] py-1.5 text-xs last:border-0">
            <span className="font-semibold">{p.full_name}</span>
            <span className="font-mono text-muted-foreground">{p.mrn}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
