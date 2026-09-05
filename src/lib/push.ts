/**
 * Browser push helpers: desktop/mobile notification popups + a short alert sound
 * for HealthFury alerts (lab results, chat messages, critical findings).
 */

export type PushState = "unsupported" | "blocked-in-preview" | "default" | "granted" | "denied";

export function pushState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (window.top !== window.self && Notification.permission !== "granted") {
    return "blocked-in-preview";
  }
  return Notification.permission as PushState;
}

export async function requestPush(): Promise<PushState> {
  const state = pushState();
  if (state !== "default") return state;
  try {
    const result = await Notification.requestPermission();
    return result as PushState;
  } catch {
    return "blocked-in-preview";
  }
}

let audioCtx: AudioContext | null = null;

export function playAlertSound(urgent = false) {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx ?? new Ctor();
    void audioCtx.resume();
    const now = audioCtx.currentTime;
    const beeps = urgent ? [0, 0.22, 0.44] : [0];
    beeps.forEach((offset) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(urgent ? 980 : 720, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {
    /* audio is best-effort */
  }
}

export function showPush(opts: {
  title: string;
  body?: string | null;
  link?: string | null;
  urgent?: boolean;
  tag?: string;
}) {
  playAlertSound(opts.urgent);
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notification = new Notification(opts.title, {
      body: opts.body ?? undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: opts.tag,
      requireInteraction: opts.urgent,
    });
    notification.onclick = () => {
      window.focus();
      if (opts.link) window.location.href = opts.link;
      notification.close();
    };
  } catch {
    /* notification construction can fail on some mobile browsers */
  }
}
