import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ScanInput = z.object({
  imageDataUrl: z.string().min(100).max(8_000_000),
  mimeType: z.string().default("image/jpeg"),
  notes: z.string().max(500).optional(),
});

export const analyzeHealthScan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data }) => {
    const { runHealthScan } = await import("@/lib/scan.server");
    return runHealthScan(data);
  });