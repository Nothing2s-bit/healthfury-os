import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runLabOrderAnalysis } from "@/lib/lab.functions";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { FlaskConical, Loader2, Microscope, ClipboardList, Sparkles } from "lucide-react";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Laboratory Services — HealthFury" },
      {
        name: "description",
        content:
          "Order laboratory tests, track sample turnaround times and capture results in the HealthFury lab register.",
      },
      { property: "og:title", content: "Laboratory Services — HealthFury" },
      {
        property: "og:description",
        content: "Live lab test catalogue, order register and result capture for clinical staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabPage,
});

type LabTest = {
  id: string;
  code: string;
  name: string;
  department: string;
  sample_type: string;
  turnaround_hours: number;
  price_cents: number;
  available: boolean;
  notes: string | null;
};

type PatientFileMini = { id: string; full_name: string; mrn: string };

type LabOrder = {
  id: string;
  patient_name: string;
  patient_file_id: string | null;
  test_name: string;
  priority: string;
  status: string;
  ordered_by_name: string | null;
  result_summary: string | null;
  result_flag: string | null;
  resulted_at: string | null;
  created_at: string;
};

const STAFF_ROLES = ["doctor", "nurse", "admin", "storage_manager", "minister"];
const PRIORITIES = ["routine", "urgent", "stat"];

function LabPage() {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [tests, setTests] = useState<LabTest[]>([]);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [dept, setDept] = useState("All");
  const [form, setForm] = useState({ patient_name: "", test_id: "", priority: "routine", file_id: "" });
  const [files, setFiles] = useState<PatientFileMini[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isStaff = !!roles?.some((r) => STAFF_ROLES.includes(r));

  const load = useCallback(async () => {
    const [{ data: t }, { data: o }, { data: f }] = await Promise.all([
      supabase.from("lab_tests").select("*").order("department").order("name"),
      supabase
        .from("lab_orders")
        .select("id,patient_name,patient_file_id,test_name,priority,status,ordered_by_name,result_summary,result_flag,resulted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("patient_files").select("id, full_name, mrn").order("full_name").limit(200),
    ]);
    setTests((t ?? []) as LabTest[]);
    setOrders((o ?? []) as LabOrder[]);
    setFiles((f ?? []) as PatientFileMini[]);
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
      .channel("lab-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, load]);

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(tests.map((t) => t.department)))],
    [tests],
  );
  const shownTests = dept === "All" ? tests : tests.filter((t) => t.department === dept);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const test = tests.find((t) => t.id === form.test_id);
    if (!form.patient_name.trim() || !test) {
      setMsg("Enter a patient name and pick a test.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("lab_orders").insert({
      patient_name: form.patient_name.trim(),
      patient_file_id: form.file_id || null,
      test_id: test.id,
      test_name: `${test.code} — ${test.name}`,
      priority: form.priority,
      status: "ordered",
      ordered_by: userId,
      ordered_by_name: staffName || "Staff member",
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setForm({ patient_name: "", test_id: "", priority: "routine", file_id: "" });
    setMsg("Lab order placed.");
    load();
  }

  async function advance(order: LabOrder, status: string) {
    await supabase
      .from("lab_orders")
      .update({
        status,
        ...(status === "resulted"
          ? { result_summary: result[order.id] || order.result_summary, resulted_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", order.id);
    load();
  }

  async function runAnalysis(order: LabOrder) {
    setRunningId(order.id);
    setMsg(null);
    try {
      const out = await runLabOrderAnalysis({ data: { orderId: order.id } });
      setMsg(`AI analysis released for ${order.patient_name} · notified ${out.notified} user(s).`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "AI lab analysis failed.");
    } finally {
      setRunningId(null);
    }
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
            LABORATORY
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The lab register is restricted to clinical and laboratory staff.
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
          LABORATORY SERVICES
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Full test catalogue, sample types, turnaround times and a live order register.
        </p>

        <section className="mt-5 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <ClipboardList className="h-4 w-4" /> Order a test
          </h2>
          <form onSubmit={placeOrder} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Patient full name"
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.test_id}
              onChange={(e) => setForm({ ...form, test_id: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Select test…</option>
              {tests
                .filter((t) => t.available)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
            </select>
            <select
              value={form.file_id}
              onChange={(e) => setForm({ ...form, file_id: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Link patient file (optional)</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} · {f.mrn}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
            <button
              disabled={saving}
              className="rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60"
            >
              {saving ? "Saving…" : "Place order"}
            </button>
          </form>
          {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
        </section>

        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <Microscope className="h-4 w-4" /> Test catalogue
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full border px-3 py-1 font-display text-[11px] uppercase tracking-wider ${
                  dept === d
                    ? "border-[oklch(0.6_0.15_65)] bg-[oklch(0.95_0.06_85)] text-[oklch(0.4_0.12_65)]"
                    : "border-[oklch(0.86_0.06_82)] text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mt-2 overflow-x-auto rounded-xl border-2 border-[oklch(0.82_0.1_80)] bg-white/80">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[oklch(0.95_0.05_85)] font-display text-[11px] uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Test</th>
                  <th className="px-3 py-2">Sample</th>
                  <th className="px-3 py-2 text-right">TAT</th>
                  <th className="px-3 py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {shownTests.map((t) => (
                  <tr key={t.id} className="border-t border-[oklch(0.9_0.05_85)]">
                    <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-2 font-medium">
                      {t.name}
                      {!t.available && (
                        <span className="ml-2 rounded bg-[oklch(0.5_0.19_25)] px-1.5 py-0.5 text-[10px] uppercase text-white">
                          offline
                        </span>
                      )}
                      {t.notes && <div className="text-[11px] text-muted-foreground">{t.notes}</div>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.sample_type}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{t.turnaround_hours}h</td>
                    <td className="px-3 py-2 text-right">R{(t.price_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
            <FlaskConical className="h-4 w-4" /> Order register
          </h2>
          <ul className="mt-2 space-y-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-[oklch(0.85_0.08_82)] bg-white/80 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-semibold">{o.patient_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.test_name} · <span className="uppercase">{o.priority}</span> ·{" "}
                  <strong className="uppercase">{o.status}</strong>
                  {o.ordered_by_name ? ` · ordered by ${o.ordered_by_name}` : ""}
                </p>
                {o.result_summary && (
                  <p className="mt-1 rounded bg-[oklch(0.96_0.04_85)] p-2 text-xs">
                    {o.result_summary}
                    {o.result_flag && o.result_flag !== "normal" && (
                      <strong className={`ml-2 uppercase ${o.result_flag === "critical" ? "text-[oklch(0.5_0.19_25)]" : "text-[oklch(0.62_0.15_65)]"}`}>
                        {o.result_flag}
                      </strong>
                    )}
                  </p>
                )}
                {o.status !== "resulted" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => runAnalysis(o)}
                      disabled={runningId === o.id}
                      className="flex items-center gap-1 rounded-full border border-[oklch(0.55_0.12_155)] px-3 py-1 text-[11px] uppercase tracking-wider text-[oklch(0.4_0.1_155)] disabled:opacity-60"
                    >
                      {runningId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI analysis
                    </button>
                    {o.status === "ordered" && (
                      <button
                        onClick={() => advance(o, "collected")}
                        className="rounded-full border border-[oklch(0.72_0.14_75)] px-3 py-1 text-[11px] uppercase tracking-wider"
                      >
                        Mark collected
                      </button>
                    )}
                    {o.status === "collected" && (
                      <button
                        onClick={() => advance(o, "processing")}
                        className="rounded-full border border-[oklch(0.72_0.14_75)] px-3 py-1 text-[11px] uppercase tracking-wider"
                      >
                        Mark processing
                      </button>
                    )}
                    <input
                      placeholder="Result summary"
                      value={result[o.id] ?? ""}
                      onChange={(e) => setResult({ ...result, [o.id]: e.target.value })}
                      className="min-w-[140px] flex-1 rounded border border-[oklch(0.86_0.06_82)] px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => advance(o, "resulted")}
                      className="rounded-full bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-3 py-1 text-[11px] uppercase tracking-wider text-white"
                    >
                      Release result
                    </button>
                  </div>
                )}
              </li>
            ))}
            {orders.length === 0 && (
              <li className="text-xs text-muted-foreground">No lab orders yet.</li>
            )}
          </ul>
        </section>
      </div>
    </HieroFrame>
  );
}
