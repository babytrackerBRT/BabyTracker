"use client";

import { useEffect } from "react";
import { initLocalNotifications, rescheduleNext24hReminders } from "@/lib/native/notifications";
import { getMyFamilyId } from "@/lib/data/family";

// Bootstrapping notifikacija samo u browseru (Capacitor WebView)
export function NotificationsBootstrap() {
  useEffect(() => {
    (async () => {
      try {
        await initLocalNotifications();
        const familyId = await getMyFamilyId();
        await rescheduleNext24hReminders({ familyId });
      } catch {
        // tiho – ne rušimo app
      }
    })();
  }, []);

  return null;
}
