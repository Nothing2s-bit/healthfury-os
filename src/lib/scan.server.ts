import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

export const ScanResultSchema = z.object({
  overallImpression: z.string(),
  observations: z.array(
    z.object({
      area: z.string(),
      finding: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  possibleRelatedConditions: z.array(z.string()),
  selfCare: z.array(z.string()),
  urgency: z.enum(["self-care", "see a GP soon", "see a doctor today", "seek emergency care"]),
  redFlags: z.array(z.string()),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

const SYSTEM_PROMPT = `You are HealthFury's AI Health Scan — a visual wellness observation assistant.

You receive a photo of a person (face, eyes, skin, throat, or another body area) plus optional notes.

Rules you MUST follow:
- You are NOT a doctor. Never diagnose, never prescribe, never give dosages.
- Describe only what is visually observable (e.g. "eyes appear reddened", "skin on left forearm shows a raised rash").
- Frame anything beyond observation as "this could be related to…", never as a verdict.
- Use confidence "low" whenever image quality, lighting, or angle limits what you can see.
- If the image shows no person or is unusable, say so plainly in overallImpression and return empty observations.
- If you see signs that could be urgent (severe swelling, blue lips, facial droop, large wounds, spreading rash with fever), set urgency to "seek emergency care" and list the red flags.
- Keep each string short and in plain language.`;

export async function runHealthScan(input: {
  imageDataUrl: string;
  notes?: string;
  mimeType: string;
}): Promise<ScanResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured. Please try again later.");

  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3-flash-preview");

  const base64 = input.imageDataUrl.includes(",")
    ? input.imageDataUrl.split(",")[1]
    : input.imageDataUrl;

  try {
    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      experimental_output: Output.object({ schema: ScanResultSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform a visual health observation of this photo. Limit observations to at most 5 items and possibleRelatedConditions to at most 4 items.${
                input.notes ? `\n\nPatient notes: ${input.notes}` : ""
              }`,
            },
            {
              type: "image",
              image: base64,
              mediaType: input.mimeType,
            },
          ],
        },
      ],
    });

    const output = result.experimental_output;
    return {
      ...output,
      observations: output.observations.slice(0, 5),
      possibleRelatedConditions: output.possibleRelatedConditions.slice(0, 4),
      selfCare: output.selfCare.slice(0, 5),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        overallImpression:
          "The scan could not be interpreted reliably. Try again with better lighting and a steady, close shot.",
        observations: [],
        possibleRelatedConditions: [],
        selfCare: [],
        urgency: "see a GP soon",
        redFlags: [],
      };
    }
    console.error("Health scan error", error);
    throw new Error("The health scan failed. Please try again.");
  }
}