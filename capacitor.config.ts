import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pogo.babylog",
  appName: "Pogo Baby Log",
  webDir: "next",
  bundledWebRuntime: false,

  // WebView učitava tvoj deploy (najjednostavnije za Next.js)
  server: {
    url: "https://baby-tracker-plum-five.vercel.app",
    cleartext: false,
  },

  android: {
    // ništa specijalno za sad
  },
};

export default config;
