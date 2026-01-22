"use client";

import { useEffect } from "react";
import { getMyFamilyId } from "@/lib/data/family";

function isNativeCapacitor(): boolean {
  // siguran guard – radi i na webu i u WebView
  const w = globalThis as any;
  return !!w?.Capacitor?.isNativePlatform;
}

export function NotificationsBootstrap() {
  useEffect(() => {
    (async () => {
      // ❗ na webu ništa ne radimo
      if (!isNativeCapacitor()) return;

      try {
        const { initLocalNotifications, rescheduleNext24hReminders } = await import(
          "@/lib/native/notifications"
        );

        await initLocalNotifications();

        const familyId = await getMyFamilyId();
        await rescheduleNext24hReminders({ familyId });
      } catch (e) {
        // tiho – ne rušimo app
        // console.log("NotificationsBootstrap error", e);
      }
    })();
  }, []);

  return null;
}
