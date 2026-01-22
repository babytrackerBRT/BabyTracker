import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/lib/supabase/client";

type OccurrenceRow = {
  id: string;
  title: string;
  scheduled_for: string;
  status: string;
  category: string;
  baby_id: string | null;
};

function hashToIntId(s: string): number {
  // stabilan 32-bit int (Capacitor traži broj)
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  // pozitivno
  return Math.abs(h) || 1;
}

export async function initLocalNotifications() {
  // Permission
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") {
      // user odbio – samo izađi tiho
      return;
    }
  }

  // Channel: vibracija DA, zvuk NE
  await LocalNotifications.createChannel({
    id: "pogo_reminders",
    name: "Pogo podsetnici",
    importance: 4, // DEFAULT/HIGH - dovoljno da vibrira
    sound: undefined, // bez zvuka
    vibration: true,
  });
}

export async function rescheduleNext24hReminders(params: { familyId: string }) {
  const { familyId } = params;

  // očisti prethodno zakazane (da nema dupliranja)
  await LocalNotifications.cancel({ notifications: [] }).catch(() => {});

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

  const notifications = rows.map((r) => ({
    id: hashToIntId(r.id),
    title: r.title,
    body: r.baby_id ? `Podsetnik za bebu` : `Porodični podsetnik`,
    schedule: { at: new Date(r.scheduled_for) },
    channelId: "pogo_reminders",
  }));

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}
