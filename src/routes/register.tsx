import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

type Role = "patient" | "nurse" | "doctor" | "admin";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: (["patient", "nurse", "doctor", "admin"].includes(String(s.role))
      ? (s.role as Role)
      : "patient") as Role,
  }),
  head: () => ({
    meta: [
      { title: "Registration Portal — HealthFury 2.0" },
      {
        name: "description",
        content:
          "Register as a patient, nurse, doctor, or admin on the HealthFury 2.0 National Health Operating System.",
      },
    ],
  }),
  component: RegisterPage,
});

const emailPass = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

function RegisterPage() {
  const { role: initialRole } = useSearch({ from: "/register" });
  const [active, setActive] = useState<Role>(initialRole);

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-md px-6 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
          >
            ‹
          </Link>
          <AnkhLogo size={40} />
          <div className="h-9 w-9" />
        </div>

        <div className="mt-3 rounded-md border-2 border-[oklch(0.72_0.14_75)] bg-white/60 px-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-widest text-gold-gradient">
            HEALTH-FURY OS 2
          </h1>
          <p className="mt-1 font-display text-xs font-semibold uppercase tracking-[0.25em] text-[oklch(0.4_0.08_60)]">
            Registration Portal
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {(["patient", "nurse", "doctor", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setActive(r)}
              className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider ring-1 transition ${
                active === r
                  ? "bg-gradient-to-b from-[oklch(0.9_0.11_88)] to-[oklch(0.65_0.15_68)] text-[oklch(0.25_0.06_50)] ring-[oklch(0.55_0.15_65)]"
                  : "bg-white/70 text-[oklch(0.4_0.08_60)] ring-[oklch(0.82_0.1_80)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-5">
          <RegistrationPanel role={active} />
          <SignInPanel />
        </div>
      </div>
    </HieroFrame>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border-2 border-[oklch(0.72_0.14_75)] bg-white/70 p-4 shadow-sm">
      <h2 className="text-center font-display text-sm font-bold uppercase tracking-widest text-[oklch(0.35_0.06_60)]">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 font-display text-xs font-semibold uppercase tracking-wider text-[oklch(0.4_0.08_60)]">
        ☥ {label}
      </span>
      <input
        {...props}
        className="flex-1 rounded border border-[oklch(0.82_0.1_80)] bg-white px-2 py-1 text-sm text-[oklch(0.25_0.06_50)] outline-none focus:border-[oklch(0.6_0.15_65)]"
      />
    </label>
  );
}

function GoldButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="mt-2 w-full rounded-md border-2 border-[oklch(0.55_0.15_65)] bg-gradient-to-b from-[oklch(0.9_0.11_88)] to-[oklch(0.65_0.15_68)] px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-[oklch(0.25_0.06_50)] shadow transition active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function RegistrationPanel({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const title = useMemo(
    () =>
      role === "patient"
        ? "Patient Registration"
        : role === "nurse"
          ? "Nurse Registration"
          : role === "doctor"
            ? "Doctor Registration"
            : "Admin Registration",
    [role],
  );

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const parsed = emailPass.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      setMsg({ kind: "err", text: parsed.error.issues[0].message });
      return;
    }
    setBusy(true);
    const metadata: Record<string, string> = { role };
    for (const k of [
      "full_name",
      "date_of_birth",
      "id_number",
      "staff_id",
      "specialty",
      "shift_preference",
      "license_num",
      "dept_specialty",
      "consult_hours",
    ]) {
      if (form[k]) metadata[k] = form[k];
    }
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: metadata,
      },
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    if (data.session) {
      navigate({ to: role === "doctor" ? "/doctor" : "/dashboard" });
    } else {
      setMsg({
        kind: "ok",
        text: "Account created. You can sign in below.",
      });
    }
  }

  return (
    <Panel title={title}>
      <form onSubmit={onSubmit} className="space-y-2">
        <Field label="Email" type="email" value={form.email ?? ""} onChange={set("email")} required />
        <Field label="Password" type="password" value={form.password ?? ""} onChange={set("password")} required />

        {role === "patient" && (
          <>
            <Field label="Full Name" value={form.full_name ?? ""} onChange={set("full_name")} />
            <Field label="Date of Birth" type="date" value={form.date_of_birth ?? ""} onChange={set("date_of_birth")} />
            <Field label="ID Number" value={form.id_number ?? ""} onChange={set("id_number")} />
          </>
        )}
        {role === "nurse" && (
          <>
            <Field label="Full Name" value={form.full_name ?? ""} onChange={set("full_name")} />
            <Field label="Staff ID" value={form.staff_id ?? ""} onChange={set("staff_id")} />
            <Field label="Specialty" value={form.specialty ?? ""} onChange={set("specialty")} />
            <Field label="Shift Pref" value={form.shift_preference ?? ""} onChange={set("shift_preference")} />
          </>
        )}
        {role === "doctor" && (
          <>
            <Field label="Full Name" value={form.full_name ?? ""} onChange={set("full_name")} />
            <Field label="License Num" value={form.license_num ?? ""} onChange={set("license_num")} />
            <Field label="Dept/Specialty" value={form.dept_specialty ?? ""} onChange={set("dept_specialty")} />
            <Field label="Consult Hours" value={form.consult_hours ?? ""} onChange={set("consult_hours")} />
          </>
        )}
        {role === "admin" && (
          <>
            <Field label="Full Name" value={form.full_name ?? ""} onChange={set("full_name")} />
            <Field label="Staff ID" value={form.staff_id ?? ""} onChange={set("staff_id")} />
            <Field label="Department" value={form.dept_specialty ?? ""} onChange={set("dept_specialty")} />
          </>
        )}

        <GoldButton type="submit" disabled={busy}>
          {busy ? "Creating…" : role === "patient" ? "Proceed" : role === "nurse" ? "Nurse Access" : role === "doctor" ? "Doctor Login" : "Admin Access"}
        </GoldButton>

        {msg && (
          <p
            className={`text-center text-xs ${
              msg.kind === "ok" ? "text-[oklch(0.5_0.15_155)]" : "text-[oklch(0.5_0.19_25)]"
            }`}
          >
            {msg.text}
          </p>
        )}
      </form>
    </Panel>
  );
}

function SignInPanel() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = emailPass.safeParse({ email, password });
    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    const userId = signInData.user?.id;
    let dest: string = "/dashboard";
    if (userId) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (roles?.some((r) => r.role === "doctor")) dest = "/doctor";
    }
    setBusy(false);
    navigate({ to: dest });
  }

  return (
    <Panel title="Already Registered? Sign In">
      <form onSubmit={onSubmit} className="space-y-2">
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <GoldButton type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Enter Temple"}
        </GoldButton>
        {err && <p className="text-center text-xs text-[oklch(0.5_0.19_25)]">{err}</p>}
      </form>
    </Panel>
  );
}