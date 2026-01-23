// lib/native/remindersSync.ts
type ReminderToNotify = {
  id: string;
  title: string;
  category: string;
  scheduled_for: string; // ISO
};

function isNativeCapacitor(): boolean {
  const w = globalThis as any;
  const cap = w?.Capacitor;
  if (!cap) return false;

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

export async function syncRemindersToLocalNotifications(reminders: ReminderToNotify[]) {
  // ✅ web/no-capacitor: tiho izađi
  if (!isNativeCapacitor()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  // permission
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") return;
  }

  // channel (vibracija da, zvuk ne)
  await LocalNotifications.createChannel({
    id: "pogo_reminders",
    name: "Pogo podsetnici",
    importance: 4,
    sound: undefined,
    vibration: true,
  });

  // očisti prethodno zakazane (MVP stabilno)
  const pending = await LocalNotifications.getPending();
  if (pending?.notifications?.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n: any) => ({ id: n.id })),
    });
  }

  // zakazi nove
  const notifications = reminders.map((r) => ({
    id: hashToIntId(r.id),
    title: r.title,
    body: r.category ? `Kategorija: ${r.category}` : "Podsetnik",
    schedule: { at: new Date(r.scheduled_for) },
    channelId: "pogo_reminders",
  }));

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}
