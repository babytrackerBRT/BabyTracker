import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pogo.babylog",
  appName: "Pogo Baby Log",
  webDir: ".next",
  server: {
    url: "https://baby-tracker-plum-five.vercel.app/cap",
    cleartext: false,
  },
};

export default config;
