export type RecordKind = "audio" | "video";

export async function startRecorder(kind: RecordKind): Promise<{
  recorder: MediaRecorder;
  stream: MediaStream;
  mime: string;
  ext: string;
  chunks: Blob[];
}> {
  const constraints: MediaStreamConstraints =
    kind === "video"
      ? { audio: true, video: { facingMode: "user", width: 640, height: 480 } }
      : { audio: true };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  const candidates =
    kind === "video"
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  const mime =
    candidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ||
    (kind === "video" ? "video/webm" : "audio/webm");
  const ext = mime.includes("mp4") ? (kind === "video" ? "mp4" : "m4a") : "webm";

  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  return { recorder, stream, mime, ext, chunks };
}

export function stopRecorder(recorder: MediaRecorder, stream: MediaStream): Promise<Blob> {
  return new Promise((resolve) => {
    recorder.onstop = () => {
      const type = recorder.mimeType || "application/octet-stream";
      const parts: Blob[] = (recorder as unknown as { _chunks?: Blob[] })._chunks || [];
      resolve(new Blob(parts, { type }));
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.stop();
  });
}