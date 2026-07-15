import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are HealthFury's AI Symptom Companion — a warm, careful health assistant.

Rules you MUST follow:
- You are NOT a doctor. Never diagnose, never prescribe, never give dosages.
- Provide general educational information and safe, non-diagnostic guidance only.
- Ask 1–2 clarifying questions when symptoms are vague (duration, severity, location, associated symptoms, age group, pre-existing conditions).
- Offer a short list of *possible* general categories the symptoms could relate to, always framed as "this could be related to…", never as a verdict.
- Suggest reasonable self-care steps only for clearly minor issues (mild cold, minor headache, small cuts).
- ALWAYS end with a clear next-step recommendation: self-care, see a GP soon, see a doctor today, or seek emergency care.
- Red-flag symptoms (chest pain, trouble breathing, stroke signs, severe bleeding, suicidal thoughts, severe allergic reaction, sudden severe headache, signs of sepsis, pregnancy emergencies, symptoms in infants) → immediately advise emergency services (e.g. 911 / 112 / 999 / local equivalent) and stop giving other advice.
- Keep responses concise, structured with short markdown sections and bullet points. Use plain language.
- End every substantive reply with a short disclaimer: "*This is general information, not medical advice.*"

Tone: calm, kind, respectful. If the user is anxious, acknowledge it first.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI gateway error";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});