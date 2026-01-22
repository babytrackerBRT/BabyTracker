import { Capacitor } from "@capacitor/core";

function isNative(): boolean {
  return Capacitor.getPlatform() !== "web";
}

export async function testVibrateNotification() {
  if (!isNative()) {
    alert("Ovaj test radi samo u Android aplikaciji (Capacitor).");
    return;
  }

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") return;
  }

  await LocalNotifications.createChannel({
    id: "pogo_reminders",
    name: "Pogo podsetnici",
    importance: 4,
    sound: undefined,
    vibration: true,
  });

  const in10s = new Date(Date.now() + 10_000);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 101,
        title: "Test podsetnik",
        body: "Ako ovo vibrira bez zvuka — završili smo setup ✅",
        schedule: { at: in10s },
        channelId: "pogo_reminders",
      },
    ],
  });
}
