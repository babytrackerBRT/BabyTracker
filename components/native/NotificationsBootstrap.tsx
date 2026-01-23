"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { getMyFamilyId } from "@/lib/data/family";

export function NotificationsBootstrap() {
  useEffect(() => {
    (async () => {
      // ✅ samo na native (Android app). Na webu NE RADIMO ništa.
      if (Capacitor.getPlatform() === "web") return;

      try {
        const { initLocalNotifications, syncNativeNotificationsForFamily } = await import(
          "@/lib/native/notifications"
        );

        await initLocalNotifications();

        const familyId = await getMyFamilyId();
        await syncNativeNotificationsForFamily(familyId);
      } catch {
        // tiho
      }
    })();
  }, []);

  return null;
}
