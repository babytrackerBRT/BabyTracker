import { LocalNotifications } from "@capacitor/local-notifications";

export async function testVibrateNotification() {
  // permission
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== "granted") return;
  }

  // channel: vibracija DA, zvuk NE
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
