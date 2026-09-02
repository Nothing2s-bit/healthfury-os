import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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

  async function load(uid: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,link,urgency,read_at,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      setUserId(data.user.id);
      void load(data.user.id);
      const channel = supabase
        .channel(`notifications-${data.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, (payload) => {
          setItems((current) => [payload.new as Notification, ...current].slice(0, 30));
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      active = false;
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
      <button aria-label="Open notifications" onClick={() => setOpen((value) => !value)} className="relative rounded-full border border-[oklch(0.72_0.14_75)] bg-white/80 p-2 text-[oklch(0.4_0.12_65)] shadow-sm">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[oklch(0.5_0.19_25)] px-1 text-center text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-[oklch(0.99_0.02_90)] p-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[oklch(0.86_0.06_82)] pb-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">Notifications</h2>
            <div className="flex items-center gap-2">
              {unread > 0 && <button onClick={markAllRead} title="Mark all as read" className="text-[10px] text-[oklch(0.5_0.12_65)]"><Check className="inline h-3 w-3" /> Read all</button>}
              <button aria-label="Close notifications" onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          </div>
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
