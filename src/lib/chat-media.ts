export type RecordKind = "audio" | "video";

export type RecorderHandle = {
  stream: MediaStream;
  mime: string;
  ext: string;
  stop: () => Promise<{ blob: Blob; mime: string; ext: string; durationMs: number }>;
  cancel: () => void;
};

export async function startRecorder(kind: RecordKind): Promise<RecorderHandle> {
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
    candidates.find(
      (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
    ) || (kind === "video" ? "video/webm" : "audio/webm");
  const ext = mime.includes("mp4") ? (kind === "video" ? "mp4" : "m4a") : "webm";

  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const startedAt = Date.now();
  recorder.start();

  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stream,
    mime,
    ext,
    cancel: () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* noop */
      }
      stopTracks();
    },
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          stopTracks();
          resolve({ blob, mime, ext, durationMs: Date.now() - startedAt });
        };
        if (recorder.state !== "inactive") recorder.stop();
        else {
          const blob = new Blob(chunks, { type: mime });
          stopTracks();
          resolve({ blob, mime, ext, durationMs: Date.now() - startedAt });
        }
      }),
  };
}