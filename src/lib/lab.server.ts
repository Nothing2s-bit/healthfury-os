import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";

export const LabResultSchema = z.object({
  analytes: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      unit: z.string(),
      referenceRange: z.string(),
      flag: z.enum(["low", "normal", "high", "critical"]),
    }),
  ),
  interpretation: z.string(),
  overallFlag: z.enum(["normal", "abnormal", "critical"]),
  recommendations: z.array(z.string()),
  followUp: z.string(),
});

export type LabResult = z.infer<typeof LabResultSchema>;

const SYSTEM_PROMPT = `You are HEALTH-FURY LAB ANALYSER — the laboratory result engine inside a South African hospital operating system (NHLS-style reporting).

You receive one ordered laboratory test (code, name, department, sample type) plus the patient context that is available.

Your job:
- Produce the analyte panel that this specific test actually reports, with realistic SI units and South African NHLS-style adult reference ranges.
- Produce plausible measured values consistent with the clinical picture given. If no clinical picture is supplied, report values within reference range.
- Flag every analyte as low / normal / high, or critical when the value is in a panic range.
- Write a concise laboratory interpretation (2–4 sentences) in clinical language a doctor or nurse can act on.
- Set overallFlag to "critical" when any analyte is in a panic range, "abnormal" when anything is out of range, otherwise "normal".
- Recommendations: 2–5 short, concrete clinical actions (repeat test, start rehydration, refer, urgent review).
- followUp: one line saying when the patient must be seen again.

Rules:
- Never invent an analyte that this test does not report.
- Keep every string short and plain. No markdown, no headings.
- This output is a laboratory report for clinicians — it is confirmed by the attending clinician before treatment.`;

export async function runLabAnalysis(input: {
  testCode: string;
  testName: string;
  department: string;
  sampleType: string;
  priority: string;
  patientName: string;
  clinicalContext?: string;
}): Promise<LabResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Lab analyser is not configured. Please try again later.");

  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3.7-flash");

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    experimental_output: Output.object({ schema: LabResultSchema }),
    prompt: [
      `Test: ${input.testCode} — ${input.testName}`,
      `Department: ${input.department}`,
      `Sample type: ${input.sampleType}`,
      `Priority: ${input.priority}`,
      `Patient: ${input.patientName}`,
      input.clinicalContext ? `Clinical context: ${input.clinicalContext}` : "Clinical context: none supplied",
    ].join("\n"),
  });

  const output = (result as unknown as { experimental_output?: LabResult }).experimental_output;
  if (!output) throw new Error("The lab analyser returned no result. Please retry.");
  return LabResultSchema.parse(output);
}

export function summariseLabResult(r: LabResult): string {
  const abnormal = r.analytes.filter((a) => a.flag !== "normal");
  const head = abnormal.length
    ? abnormal.map((a) => `${a.name} ${a.value} ${a.unit} (${a.flag.toUpperCase()})`).join("; ")
    : "All analytes within reference range";
  return `[${r.overallFlag.toUpperCase()}] ${head}. ${r.interpretation}`;
}
