import type { CapacitorConfig } from "@capacitor/cli";
import fs from "fs";
import path from "path";

/**
 * Play Store wrapper — the Android WebView loads the DEPLOYED site directly
 * (server.url), so /api/* routes keep working without a static export.
 *
 * Set CAP_SERVER_URL in .env.local (or edit the fallback below), then:
 *   npm run cap:sync && npm run cap:open
 */

function envFromLocal(key: string): string | undefined {
  try {
    const env = fs.readFileSync(path.join(__dirname, ".env.local"), "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key && m[2]) return m[2];
    }
  } catch {
    /* no .env.local */
  }
  return process.env[key];
}

const config: CapacitorConfig = {
  appId: "com.sprachdost.app",
  appName: "SprachDost",
  webDir: "public",
  server: {
    // ⬇️ https required for microphone permissions inside the WebView
    url: envFromLocal("CAP_SERVER_URL") ?? "https://sprachdost.vercel.app",
    androidScheme: "https",
  },
};

export default config;
