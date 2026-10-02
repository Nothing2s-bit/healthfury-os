import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { FolderOpen, FlaskConical, Loader2, Search, UserPlus, CalendarClock, Download, Send, Camera } from "lucide-react";
import { toCsv, downloadCsv, submitToDoh } from "@/lib/patient-export";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Digital Patient Files — HealthFury" },
      {
        name: "description",
        content:
          "Capture and review complete digital hospital patient files, vitals, allergies and their bookings.",
      },
      { property: "og:title", content: "Digital Patient Files — HealthFury" },
      {
        property: "og:description",
        content: "Staff data-capture log with full patient records and live booking history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientsPage,
});

type PatientFile = {
  id: string;
  mrn: string;
  patient_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  id_number: string | null;
  phone: string | null;
  chief_complaint: string | null;
  condition: string | null;
  status: string;
  bp: string | null;
  hr: string | null;
  temp: string | null;
  spo2: string | null;
  allergies: string[];
  medications: string[];
  notes: string | null;
  address: string | null;
  area_code: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

type LabRow = {
  id: string;
  test_name: string;
  status: string;
  result_summary: string | null;
  result_flag: string | null;
  resulted_at: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  reference_code: string;
  status: string;
  clinic_id: string;
  qr_payload: string;
};

const STAFF_ROLES = ["doctor", "nurse", "admin"];
const EMPTY = {
  mrn: "",
  full_name: "",
  date_of_birth: "",
  sex: "",
  id_number: "",
  phone: "",
  chief_complaint: "",
  condition: "",
  status: "stable",
  bp: "",
  hr: "",
  temp: "",
  spo2: "",
  allergies: "",
  medications: "",
  notes: "",
  address: "",
  area_code: "",
};

function PatientsPage() {
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Record<string, BookingRow[]>>({});
  const [clinics, setClinics] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [labOrders, setLabOrders] = useState<Record<string, LabRow[]>>({});
  const [sending, setSending] = useState(false);
  const shownRef = useRef<PatientFile[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("patient_files")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    setFiles((data ?? []) as PatientFile[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setIsStaff(false);
        setLoading(false);
        return;
      }
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const staff = (r ?? []).some((x) => STAFF_ROLES.includes(x.role as string));
      if (cancelled) return;
      setIsStaff(staff);
      if (staff) {
        const { data: cs } = await supabase.from("clinics").select("id,name");
        setClinics(Object.fromEntries((cs ?? []).map((c) => [c.id, c.name])));
        await load();
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel("patient-files-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_files" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, load]);

  async function toggleFile(file: PatientFile) {
    const next = openId === file.id ? null : file.id;
    setOpenId(next);
    if (next && !bookings[file.id] && file.patient_id) {
      const { data } = await supabase
        .from("bookings")
        .select("id,department,appointment_date,appointment_time,reference_code,status,clinic_id,qr_payload")
        .eq("patient_id", file.patient_id)
        .order("appointment_date", { ascending: false });
      const rows = (data ?? []) as BookingRow[];
      setBookings((prev) => ({ ...prev, [file.id]: rows }));
      const codes: Record<string, string> = {};
      for (const b of rows.slice(0, 6)) {
        codes[b.id] = await QRCode.toDataURL(b.qr_payload || b.reference_code, {
          margin: 1,
          width: 220,
          color: { dark: "#3a2a10", light: "#fdf6e3" },
        });
      }
      setQrCodes((prev) => ({ ...prev, ...codes }));
    }
    if (next && !labOrders[file.id]) {
      const { data: labs } = await supabase
        .from("lab_orders")
        .select("id,test_name,status,result_summary,result_flag,resulted_at,created_at")
        .eq("patient_file_id", file.id)
        .order("created_at", { ascending: false });
      setLabOrders((prev) => ({ ...prev, [file.id]: (labs ?? []) as LabRow[] }));
    }
    if (next && file.photo_path && !photoUrls[file.id]) {
      const { data } = await supabase.storage
        .from("patient-photos")
        .createSignedUrl(file.photo_path, 3600);
      if (data?.signedUrl) setPhotoUrls((prev) => ({ ...prev, [file.id]: data.signedUrl }));
    }
  }

  function exportCsv() {
    const columns = [
      "mrn","full_name","date_of_birth","sex","id_number","phone","chief_complaint",
      "condition","status","bp","hr","temp","spo2","allergies","medications",
      "address","area_code","created_at",
    ];
    const rows = shownRef.current.map((f) => ({
      ...f,
      allergies: f.allergies.join("; "),
      medications: f.medications.join("; "),
    }));
    downloadCsv(`healthfury-patient-files-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, columns));
  }

  async function sendToDoh() {
    setSending(true);
    setMsg(null);
    try {
      const reference = await submitToDoh({
        reportType: "patient_files",
        rowCount: shownRef.current.length,
        submittedBy: userId,
        note: "Patient file register exported from HealthFury OS.",
      });
      setMsg(`Sent ${shownRef.current.length} records to DOH · ${reference}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not submit to DOH.");
    } finally {
      setSending(false);
    }
  }

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!form.full_name.trim()) {
      setMsg("Patient name is required.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const mrn = form.mrn.trim() || `MRN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const { data: created, error } = await supabase.from("patient_files").insert({
      mrn,
      captured_by: userId,
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth || null,
      sex: form.sex || null,
      id_number: form.id_number || null,
      phone: form.phone || null,
      chief_complaint: form.chief_complaint || null,
      condition: form.condition || null,
      status: form.status,
      bp: form.bp || null,
      hr: form.hr || null,
      temp: form.temp || null,
      spo2: form.spo2 || null,
      allergies: form.allergies ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      medications: form.medications
        ? form.medications.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      notes: form.notes || null,
      address: form.address || null,
      area_code: form.area_code || null,
    }).select("id").single();
    if (error) {
      setSaving(false);
      setMsg(error.message);
      return;
    }
    if (photo && created?.id) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${created.id}/photo.${ext}`;
      const up = await supabase.storage.from("patient-photos").upload(path, photo, { upsert: true });
      if (!up.error) {
        await supabase.from("patient_files").update({ photo_path: path }).eq("id", created.id);
      }
    }
    setSaving(false);
    setPhoto(null);
    setForm({ ...EMPTY });
    setShowForm(false);
    setMsg(`Patient file ${mrn} captured.`);
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
            PATIENT FILES
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Only doctors, nurses and admins can open the data-capture log.
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

  const q = query.trim().toLowerCase();
  const shown = q
    ? files.filter(
        (f) =>
          f.full_name.toLowerCase().includes(q) ||
          f.mrn.toLowerCase().includes(q) ||
          (f.id_number ?? "").toLowerCase().includes(q),
      )
    : files;
  shownRef.current = shown;

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
          DIGITAL PATIENT FILES
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Capture a new file or open a record to see vitals, history and every booking.
        </p>

        <div className="mt-4 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/80 px-3 py-2">
            <Search className="h-4 w-4 text-[oklch(0.6_0.15_65)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, MRN or ID number"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-3 py-2 font-display text-xs uppercase tracking-wider text-white shadow"
          >
            <UserPlus className="h-4 w-4" /> Capture
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={exportCsv}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-[oklch(0.72_0.14_75)] bg-white/80 px-3 py-2 font-display text-[11px] uppercase tracking-wider text-[oklch(0.45_0.12_65)]"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={sendToDoh}
            disabled={sending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-b from-[oklch(0.6_0.13_155)] to-[oklch(0.45_0.12_155)] px-3 py-2 font-display text-[11px] uppercase tracking-wider text-white shadow disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send to DOH"}
          </button>
        </div>

        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}

        {showForm && (
          <form
            onSubmit={capture}
            className="mt-4 grid gap-2 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4 sm:grid-cols-2"
          >
            {(
              [
                ["full_name", "Full name"],
                ["mrn", "MRN (auto if blank)"],
                ["date_of_birth", "Date of birth (YYYY-MM-DD)"],
                ["sex", "Sex"],
                ["id_number", "ID number"],
                ["phone", "Phone"],
                ["chief_complaint", "Chief complaint"],
                ["condition", "Condition"],
                ["bp", "Blood pressure"],
                ["hr", "Heart rate"],
                ["temp", "Temperature"],
                ["spo2", "SpO₂"],
                ["allergies", "Allergies (comma separated)"],
                ["medications", "Medications (comma separated)"],
                ["address", "Address"],
                ["area_code", "Area code"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                placeholder={label}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
              />
            ))}
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            >
              <option value="stable">Stable</option>
              <option value="observation">Observation</option>
              <option value="critical">Critical</option>
            </select>
            <textarea
              placeholder="Clinical notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm sm:col-span-2"
              rows={3}
            />
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
              <Camera className="h-4 w-4 text-[oklch(0.6_0.15_65)]" />
              {photo ? photo.name : "Patient photo (camera or file)"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              disabled={saving}
              className="rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60 sm:col-span-2"
            >
              {saving ? "Saving…" : "Save patient file"}
            </button>
          </form>
        )}

        <ul className="mt-5 space-y-2">
          {shown.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border-2 border-[oklch(0.85_0.08_82)] bg-white/85 p-3"
            >
              <button
                onClick={() => toggleFile(f)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span>
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.35_0.1_65)]">
                    {f.full_name}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{f.mrn}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-white ${
                    f.status === "critical"
                      ? "bg-[oklch(0.5_0.19_25)]"
                      : f.status === "observation"
                        ? "bg-[oklch(0.62_0.15_65)]"
                        : "bg-[oklch(0.5_0.11_155)]"
                  }`}
                >
                  {f.status}
                </span>
              </button>

              {openId === f.id && (
                <div className="mt-3 space-y-3 border-t border-[oklch(0.9_0.05_85)] pt-3 text-sm">
                  {photoUrls[f.id] && (
                    <img
                      src={photoUrls[f.id]}
                      alt={`Patient photo of ${f.full_name}`}
                      className="h-28 w-28 rounded-lg border-2 border-[oklch(0.72_0.14_75)] object-cover"
                    />
                  )}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <Field label="Date of birth" value={f.date_of_birth} />
                    <Field label="Sex" value={f.sex} />
                    <Field label="ID number" value={f.id_number} />
                    <Field label="Phone" value={f.phone} />
                    <Field label="Address" value={f.address} />
                    <Field label="Area code" value={f.area_code} />
                    <Field label="Chief complaint" value={f.chief_complaint} />
                    <Field label="Condition" value={f.condition} />
                    <Field label="BP" value={f.bp} />
                    <Field label="Heart rate" value={f.hr} />
                    <Field label="Temp" value={f.temp} />
                    <Field label="SpO₂" value={f.spo2} />
                    <Field label="Allergies" value={f.allergies.join(", ")} />
                    <Field label="Medications" value={f.medications.join(", ")} />
                  </dl>
                  {f.notes && (
                    <p className="rounded-lg bg-[oklch(0.96_0.04_85)] p-2 text-xs">{f.notes}</p>
                  )}

                  <div>
                    <h3 className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
                      <CalendarClock className="h-3.5 w-3.5" /> Bookings
                    </h3>
                    {!f.patient_id && (
                      <p className="text-xs text-muted-foreground">
                        File not linked to an app account — no bookings.
                      </p>
                    )}
                    {f.patient_id && (bookings[f.id]?.length ?? 0) === 0 && (
                      <p className="text-xs text-muted-foreground">No bookings on record.</p>
                    )}
                    <ul className="mt-1 space-y-1">
                      {(bookings[f.id] ?? []).map((b) => (
                        <li
                          key={b.id}
                          className="flex items-start gap-3 rounded-lg border border-[oklch(0.9_0.05_85)] bg-white/70 p-2 text-xs text-muted-foreground"
                        >
                          {qrCodes[b.id] && (
                            <img
                              src={qrCodes[b.id]}
                              alt={`Booking QR code ${b.reference_code}`}
                              className="h-20 w-20 shrink-0 rounded border border-[oklch(0.82_0.1_80)]"
                            />
                          )}
                          <span>
                            <strong>{b.appointment_date}</strong> {b.appointment_time}
                            <br />
                            {b.department} · {clinics[b.clinic_id] ?? "Clinic"}
                            <br />
                            <span className="font-mono">{b.reference_code}</span> ({b.status})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
                      <FlaskConical className="h-3.5 w-3.5" /> Laboratory results
                    </h3>
                    {(labOrders[f.id]?.length ?? 0) === 0 && (
                      <p className="text-xs text-muted-foreground">No lab results on record.</p>
                    )}
                    <ul className="mt-1 space-y-1">
                      {(labOrders[f.id] ?? []).map((l) => (
                        <li
                          key={l.id}
                          className="rounded-lg border border-[oklch(0.9_0.05_85)] bg-white/70 p-2 text-xs text-muted-foreground"
                        >
                          <strong>{l.test_name}</strong> · <span className="uppercase">{l.status}</span>
                          {l.result_flag && l.result_flag !== "normal" && (
                            <strong
                              className={`ml-1 uppercase ${l.result_flag === "critical" ? "text-[oklch(0.5_0.19_25)]" : "text-[oklch(0.62_0.15_65)]"}`}
                            >
                              ({l.result_flag})
                            </strong>
                          )}
                          {l.result_summary && <p className="mt-1 rounded bg-[oklch(0.96_0.04_85)] p-2">{l.result_summary}</p>}
                          <p className="mt-1 text-[10px]">{new Date(l.resulted_at ?? l.created_at).toLocaleString("en-ZA")}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          ))}
          {shown.length === 0 && (
            <li className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="h-4 w-4" /> No patient files match this search.
            </li>
          )}
        </ul>
      </div>
    </HieroFrame>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </>
  );
}