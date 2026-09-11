import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ambulance,
  Check,
  ChevronDown,
  Clipboard,
  HeartPulse,
  LocateFixed,
  MapPin,
  MessageCircle,
  Phone,
  Radio,
  Share2,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency SOS — HealthFury" },
      {
        name: "description",
        content: "Call South African emergency services, share your location and find nearby emergency care.",
      },
      { property: "og:title", content: "Emergency SOS — HealthFury" },
      {
        property: "og:description",
        content: "Fast emergency calling, location sharing and nearby care for HealthFury users.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmergencyPage,
});

type EmergencyNumber = {
  number: string;
  label: string;
  detail: string;
  icon: typeof Phone;
};

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const emergencyNumbers: EmergencyNumber[] = [
  { number: "112", label: "All emergencies", detail: "Free from any mobile phone", icon: Radio },
  { number: "10177", label: "Ambulance", detail: "National medical emergency service", icon: Ambulance },
  { number: "10111", label: "Police", detail: "Crime or immediate danger", icon: ShieldAlert },
];

const firstResponse = [
  {
    title: "Not breathing or unresponsive",
    text: "Call 112 now. Put the phone on speaker. Follow the call-taker’s CPR instructions and send someone for an AED if available.",
  },
  {
    title: "Severe bleeding",
    text: "Press firmly on the wound with clean cloth or clothing. Keep steady pressure and do not remove soaked layers while help is coming.",
  },
  {
    title: "Stroke signs",
    text: "Face drooping, arm weakness or speech difficulty means act FAST. Note when symptoms began and call 112 immediately.",
  },
  {
    title: "Choking",
    text: "Call 112. If the person cannot cough, speak or breathe, follow the call-taker’s instructions immediately.",
  },
];

function EmergencyPage() {
  const [pendingCall, setPendingCall] = useState<EmergencyNumber | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [copied, setCopied] = useState(false);

  const mapsUrl = useMemo(() => {
    if (!position) return "https://www.google.com/maps/search/emergency+hospital+near+me";
    return `https://www.google.com/maps/search/emergency+hospital/@${position.latitude},${position.longitude},14z`;
  }, [position]);

  const emergencyMessage = useMemo(() => {
    const location = position
      ? `My location: https://maps.google.com/?q=${position.latitude},${position.longitude} (accuracy about ${Math.round(position.accuracy)} m).`
      : "My precise location is not available yet.";
    return `EMERGENCY: I need urgent help. ${location} Please call me and contact emergency services.`;
  }, [position]);

  function getLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location is not available on this device. You can still call emergency services.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
        setLocating(false);
        toast.success("Emergency location ready to share");
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can still call emergency services."
            : "Your location could not be found. Move to an open area and try again.";
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(emergencyMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      toast.success("Emergency message copied");
    } catch {
      toast.error("Could not copy the message on this device");
    }
  }

  async function shareMessage() {
    if (!("share" in navigator)) {
      await copyMessage();
      return;
    }
    try {
      await navigator.share({ title: "Emergency — I need help", text: emergencyMessage });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("The emergency message could not be shared");
    }
  }

  return (
    <HieroFrame className="pb-12">
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-sm font-semibold text-gold-deep">
            ‹ Dashboard
          </Link>
          <AnkhLogo size={42} />
          <span className="w-20" aria-hidden="true" />
        </header>

        <section className="mt-4 text-center" aria-labelledby="emergency-heading">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg ring-4 ring-destructive/20 motion-safe:animate-pulse">
            <SirenIcon />
          </div>
          <h1 id="emergency-heading" className="mt-3 font-display text-3xl font-bold text-destructive">
            EMERGENCY SOS
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-foreground">
            If life is in danger, call now. HealthFury does not dispatch emergency services.
          </p>
        </section>

        <section className="mt-5 grid gap-3" aria-label="Emergency phone numbers">
          {emergencyNumbers.map((service, index) => {
            const Icon = service.icon;
            return (
              <Button
                key={service.number}
                type="button"
                variant={index === 0 ? "destructive" : "outline"}
                onClick={() => setPendingCall(service)}
                className={`h-auto min-h-16 w-full justify-start px-4 py-3 text-left ${
                  index === 0
                    ? "border-2 border-destructive shadow-lg"
                    : "border-2 border-destructive/40 bg-card/90 text-foreground hover:bg-destructive/10"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="min-w-0 flex-1 whitespace-normal">
                  <span className="block font-display text-base font-bold">Call {service.number} · {service.label}</span>
                  <span className={`block text-xs ${index === 0 ? "text-destructive-foreground/85" : "text-muted-foreground"}`}>
                    {service.detail}
                  </span>
                </span>
                <Phone className="h-5 w-5" />
              </Button>
            );
          })}
        </section>

        <section className="mt-5 border-y-2 border-gold bg-card/90 px-4 py-5 text-center shadow-sm" aria-labelledby="location-heading">
          <h2 id="location-heading" className="font-display text-lg font-bold text-gold-deep">SHARE MY LOCATION</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your location stays on this device until you choose to copy or share it.
          </p>

          <Button
            type="button"
            variant="destructive"
            onClick={getLocation}
            disabled={locating}
            className="mx-auto mt-4 h-28 w-28 flex-col rounded-full border-4 border-gold-light text-base shadow-xl ring-4 ring-destructive/20 motion-safe:hover:scale-105"
          >
            <LocateFixed className="h-8 w-8" />
            {locating ? "Locating…" : position ? "Refresh SOS" : "Activate SOS"}
          </Button>

          {position && (
            <div role="status" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-jade">
              <Check className="h-4 w-4" /> Location ready · accuracy about {Math.round(position.accuracy)} m
            </div>
          )}
          {locationError && <p role="alert" className="mt-3 text-sm font-semibold text-destructive">{locationError}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={copyMessage} className="border-gold bg-background">
              {copied ? <Check /> : <Clipboard />} {copied ? "Copied" : "Copy alert"}
            </Button>
            <Button type="button" onClick={shareMessage} className="bg-gold-deep text-primary-foreground hover:bg-gold-deep/90">
              <Share2 /> Share alert
            </Button>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3" aria-label="More emergency actions">
          <Button asChild variant="outline" className="h-auto min-h-16 whitespace-normal border-2 border-gold bg-card/90 px-3 py-3 text-center">
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <MapPin className="h-5 w-5 text-destructive" /> Nearby emergency care
            </a>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-16 whitespace-normal border-2 border-gold bg-card/90 px-3 py-3 text-center">
            <Link to="/messages">
              <MessageCircle className="h-5 w-5 text-gold-deep" /> Message care team
            </Link>
          </Button>
        </section>

        <section className="mt-6" aria-labelledby="first-response-heading">
          <h2 id="first-response-heading" className="text-center font-display text-lg font-bold text-gold-deep">WHILE HELP IS COMING</h2>
          <div className="mt-3 divide-y divide-border border-y border-border bg-card/85">
            {firstResponse.map((item) => (
              <details key={item.title} className="group px-3 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-bold text-foreground">
                  {item.title}
                  <ChevronDown className="h-4 w-4 text-gold-deep transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Keep the caller safe, unlock access for responders, and follow the emergency call-taker’s instructions.
          </p>
        </section>
      </main>

      <AlertDialog open={pendingCall !== null} onOpenChange={(open) => !open && setPendingCall(null)}>
        <AlertDialogContent className="max-w-sm border-2 border-destructive bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Phone className="h-5 w-5" /> Call {pendingCall?.number}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This opens your phone dialler for {pendingCall?.label.toLowerCase()}. You must complete the call to request help.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <a href={`tel:${pendingCall?.number ?? "112"}`}>Open dialler</a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HieroFrame>
  );
}

function SirenIcon() {
  return <HeartPulse className="h-7 w-7" aria-hidden="true" />;
}