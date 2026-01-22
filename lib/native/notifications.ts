import { supabase } from "@/lib/supabase/client";

type OccurrenceRow = {
  id: string;
  title: string;
  scheduled_for: string;
  status: string;
  category: string;
  baby_id: string | null;
};

function isNativeCapacitor(): boolean {
  const w = globalThis as any;
  const cap = w?.Capacitor;
  if (!cap) return false;

  // Capacitor u webu obično postoji, ali platform je "web"
  try {
    const platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform;
    return platform && platform !== "web";
  } catch {
    return false;
  }
}

function hashToIntId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

async function getLocalNotifications() {
  const mod = await import("@capacitor/local-notifications");
  return mod.LocalNotifications;
}

export async function initLocalNotifications() {
  if (!isNativeCapacitor()) return;

  const LocalNotifications = await getLocalNotifications();

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") return;
  }

  // vibracija DA, zvuk NE
  await LocalNotifications.createChannel({
    id: "pogo_reminders",
    name: "Pogo podsetnici",
    importance: 4,
    sound: undefined,
    vibration: true,
  });
}

/**
 * OVO je centralna funkcija:
 * - pročita SVE "scheduled" reminder_occurrences u naredna 24h
 * - zakazuje native notifikacije (vibracija bez zvuka)
 *
 * Poziva se posle:
 * - dodavanja/izmena reminders
 * - mark as done
 * - auto feeding reminders
 */
export async function syncNativeNotificationsForFamily(familyId: string) {
  if (!isNativeCapacitor()) return;

  const LocalNotifications = await getLocalNotifications();

  // osiguraj permission + channel
  await initLocalNotifications();

  // obriši prethodno zakazane iz naše aplikacije
  // (najjednostavnije i najstabilnije za MVP)
  // Ako hoćeš kasnije "smart diff", uradićemo.
  const pending = await LocalNotifications.getPending();
  if (pending?.notifications?.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n: any) => ({ id: n.id })) });
  }

  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("reminder_occurrences")
    .select("id,title,scheduled_for,status,category,baby_id")
    .eq("family_id", familyId)
    .eq("status", "scheduled")
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", until.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as OccurrenceRow[];
  if (!rows.length) return;

  const notifications = rows.map((r) => ({
    id: hashToIntId(r.id),
    title: r.title,
    body: r.baby_id ? "Podsetnik za bebu" : "Porodični podsetnik",
    schedule: { at: new Date(r.scheduled_for) },
    channelId: "pogo_reminders",
  }));

  await LocalNotifications.schedule({ notifications });
}
