import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pogo.babylog",
  appName: "Pogo Baby Log",
  // webDir se ignoriše kada koristimo server.url, ostavi bilo šta
  webDir: "out",
  server: {
    url: "https://baby-tracker-plum-five.vercel.app/cap",
    cleartext: false, // https only
    // androidScheme: "https", // (opciono, default je ok)
  },
};

export default config;
