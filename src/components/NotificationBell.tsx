import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { pushState, registerPushWorker, requestPush, showPush, type PushState } from "@/lib/push";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  urgency: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [balloons, setBalloons] = useState<Notification[]>([]);

  async function load(uid: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,link,urgency,read_at,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }

  const [permission, setPermission] = useState<PushState>("default");

  useEffect(() => {
    setPermission(pushState());
    if (typeof window !== "undefined" && Notification?.permission === "granted") {
      void registerPushWorker();
    }
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const uid = data.user.id;
      setUserId(uid);
      void load(uid);
      channel = supabase
        .channel(`notifications-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, (payload) => {
          const row = payload.new as Notification;
          setItems((current) => [row, ...current].slice(0, 30));
          setBalloons((current) => [row, ...current].slice(0, 3));
          window.setTimeout(() => setBalloons((current) => current.filter((b) => b.id !== row.id)), 7000);
          showPush({
            title: row.title,
            body: row.body,
            link: row.link,
            urgent: row.urgency === "critical" || row.urgency === "high",
            tag: row.id,
          });
        })
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((item) => !item.read_at).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
  }

  async function markAllRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <div className="pointer-events-none fixed right-3 top-16 z-[60] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2">
        {balloons.map((b) => (
          <button
            key={b.id}
            onClick={() => { setBalloons((c) => c.filter((x) => x.id !== b.id)); setOpen(true); }}
            className="pointer-events-auto animate-in slide-in-from-right rounded-2xl bg-[oklch(0.55_0.21_25)] px-4 py-3 text-left text-white shadow-[0_8px_24px_oklch(0.5_0.2_25/0.45)] ring-2 ring-white/70"
          >
            <p className="flex items-center gap-1.5 text-sm font-bold"><Bell className="h-4 w-4 animate-bounce" />{b.title}</p>
            {b.body && <p className="mt-0.5 line-clamp-2 text-xs opacity-90">{b.body}</p>}
          </button>
        ))}
      </div>
      <button aria-label="Open notifications" onClick={() => setOpen((value) => !value)} className="relative rounded-full border border-[oklch(0.72_0.14_75)] bg-white/80 p-2 text-[oklch(0.4_0.12_65)] shadow-sm">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[oklch(0.5_0.19_25)] px-1 text-center text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-[oklch(0.99_0.02_90)] p-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[oklch(0.86_0.06_82)] pb-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">Notifications</h2>
            <div className="flex items-center gap-2">
              {permission !== "granted" && (
                <button
                  onClick={async () => setPermission(await requestPush())}
                  className="rounded-full border border-[oklch(0.72_0.14_75)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.4_0.12_65)]"
                >
                  Turn on alerts
                </button>
              )}
              {unread > 0 && <button onClick={markAllRead} title="Mark all as read" className="text-[10px] text-[oklch(0.5_0.12_65)]"><Check className="inline h-3 w-3" /> Read all</button>}
              <button aria-label="Close notifications" onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          </div>
          {permission === "blocked-in-preview" && (
            <p className="mt-2 rounded-md bg-[oklch(0.96_0.04_85)] px-2 py-1 text-[10px] text-[oklch(0.4_0.12_65)]">
              Open the app in its own browser tab to allow pop-up alerts.
            </p>
          )}
          {permission === "denied" && (
            <p className="mt-2 rounded-md bg-[oklch(0.96_0.04_85)] px-2 py-1 text-[10px] text-[oklch(0.4_0.12_65)]">
              Alerts are blocked. Enable notifications for this site in your browser settings.
            </p>
          )}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">No notifications yet.</p>}
            {items.map((item) => (
              <div key={item.id} className={`border-b border-[oklch(0.9_0.05_85)] py-2 ${item.read_at ? "opacity-65" : ""}`}>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{item.title}</p>
                    {item.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                  {!item.read_at && <button aria-label="Mark notification as read" onClick={() => markRead(item.id)}><Check className="h-3.5 w-3.5 text-[oklch(0.5_0.12_65)]" /></button>}
                </div>
                {item.link && <Link to={item.link as "/lab"} onClick={() => markRead(item.id)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[oklch(0.5_0.12_65)]">Open <ExternalLink className="h-3 w-3" /></Link>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
