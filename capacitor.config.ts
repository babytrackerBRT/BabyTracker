import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pogo.babylog",
  appName: "Pogo Baby Log",
  webDir: ".next",
  server: {
    url: "https://baby-tracker-plum-five.vercel.app",
    cleartext: false,
  },
};

export default config;
