import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ orderId: z.string().uuid() });

export const runLabOrderAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: order, error: orderErr } = await supabase
      .from("lab_orders")
      .select("id, patient_name, patient_file_id, test_id, test_name, priority, status, ordered_by")
      .eq("id", data.orderId)
      .maybeSingle();

    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Lab order not found or you do not have access to it.");

    let test = {
      code: order.test_name.split("—")[0]?.trim() || "LAB",
      name: order.test_name,
      department: "Laboratory",
      sample_type: "Sample",
    };
    if (order.test_id) {
      const { data: t } = await supabase
        .from("lab_tests")
        .select("code, name, department, sample_type")
        .eq("id", order.test_id)
        .maybeSingle();
      if (t) test = t;
    }

    let clinicalContext: string | undefined;
    let filePatientId: string | null = null;
    let fileNotes: string | null = null;
    if (order.patient_file_id) {
      const { data: f } = await supabase
        .from("patient_files")
        .select("patient_id, chief_complaint, condition, bp, hr, temp, spo2, allergies, medications, notes")
        .eq("id", order.patient_file_id)
        .maybeSingle();
      if (f) {
        filePatientId = f.patient_id;
        fileNotes = f.notes;
        clinicalContext = [
          f.chief_complaint ? `Complaint: ${f.chief_complaint}` : null,
          f.condition ? `Condition: ${f.condition}` : null,
          f.bp ? `BP ${f.bp}` : null,
          f.hr ? `HR ${f.hr}` : null,
          f.temp ? `Temp ${f.temp}` : null,
          f.spo2 ? `SpO2 ${f.spo2}` : null,
          (f.allergies ?? []).length ? `Allergies: ${(f.allergies ?? []).join(", ")}` : null,
          (f.medications ?? []).length ? `Medications: ${(f.medications ?? []).join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      }
    }

    const { runLabAnalysis, summariseLabResult } = await import("@/lib/lab.server");
    const result = await runLabAnalysis({
      testCode: test.code,
      testName: test.name,
      department: test.department,
      sampleType: test.sample_type,
      priority: order.priority,
      patientName: order.patient_name,
      clinicalContext: clinicalContext || undefined,
    });

    const summary = summariseLabResult(result);
    const resultedAt = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("lab_orders")
      .update({
        status: "resulted",
        result_summary: summary,
        result_detail: JSON.parse(JSON.stringify(result)),
        result_flag: result.overallFlag,
        resulted_at: resultedAt,
      })
      .eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    if (order.patient_file_id) {
      const stamp = new Date(resultedAt).toLocaleString("en-ZA");
      const entry = `[LAB ${stamp}] ${test.code} — ${test.name}: ${summary}`;
      await supabase
        .from("patient_files")
        .update({ notes: fileNotes ? `${fileNotes}\n\n${entry}` : entry })
        .eq("id", order.patient_file_id);
    }

    const critical = result.overallFlag === "critical";
    const recipients = new Set<string>();
    if (filePatientId) recipients.add(filePatientId);
    if (order.ordered_by) recipients.add(order.ordered_by);
    recipients.add(userId);

    if (critical) {
      const { data: staff } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["doctor", "nurse", "admin"]);
      (staff ?? []).forEach((s) => recipients.add(s.user_id));
    }

    const title = critical
      ? `CRITICAL lab result — ${order.patient_name}`
      : `Lab result ready — ${order.patient_name}`;

    const rows = Array.from(recipients).map((uid) => ({
      user_id: uid,
      kind: "lab_result",
      title,
      body: `${test.code} — ${test.name}: ${summary}`.slice(0, 480),
      link: uid === filePatientId ? "/dashboard" : "/lab",
      entity_id: order.id,
      urgency: critical ? "critical" : result.overallFlag === "abnormal" ? "high" : "normal",
    }));

    if (rows.length) await supabase.from("notifications").insert(rows);

    return { summary, result, resultedAt, notified: rows.length };
  });
