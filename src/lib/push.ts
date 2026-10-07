/**
 * Browser push helpers: service-worker backed notification popups + a short alert
 * sound for HealthFury alerts (lab results, chat messages, critical findings).
 *
 * The service worker lets notifications appear while the tab is in the
 * background, minimised or on a locked phone screen, and keeps them clickable
 * after the tab is gone.
 */

export type PushState = "unsupported" | "blocked-in-preview" | "default" | "granted" | "denied";

let swRegistration: ServiceWorkerRegistration | null = null;
let swPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function pushState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (window.top !== window.self && Notification.permission !== "granted") {
    return "blocked-in-preview";
  }
  return Notification.permission as PushState;
}

export async function registerPushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swRegistration) return swRegistration;
  if (!swPromise) {
    swPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        swRegistration = registration;
        return registration;
      })
      .catch(() => null);
  }
  return swPromise;
}

export async function requestPush(): Promise<PushState> {
  const state = pushState();
  if (state === "granted") {
    void registerPushWorker();
    return state;
  }
  if (state !== "default") return state;
  try {
    const result = (await Notification.requestPermission()) as PushState;
    if (result === "granted") await registerPushWorker();
    return result;
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
    // Bell "ding-dong" chime; urgent alerts ring three times.
    const notes: Array<[number, number]> = urgent
      ? [[0, 1320], [0.25, 990], [0.5, 1320], [0.75, 990], [1.0, 1320]]
      : [[0, 1320], [0.28, 990]];
    notes.forEach(([offset, freq]) => {
      [1, 2.76].forEach((harmonic, i) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq * harmonic, now + offset);
        const peak = i === 0 ? 0.35 : 0.08;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.9);
        osc.connect(gain).connect(audioCtx!.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.95);
      });
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

  void (async () => {
    const registration = await registerPushWorker();
    const payload = {
      type: "healthfury-notify",
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
      urgent: Boolean(opts.urgent),
      tag: opts.tag ?? null,
    };

    if (registration?.active) {
      registration.active.postMessage(payload);
      return;
    }
    if (registration) {
      try {
        await registration.showNotification(opts.title, {
          body: opts.body ?? undefined,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: opts.tag,
          requireInteraction: Boolean(opts.urgent),
          data: { link: opts.link ?? "/dashboard" },
        });
        return;
      } catch {
        /* fall through to the plain notification */
      }
    }

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
  })();
}
