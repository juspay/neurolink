import { copyFileSync, existsSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Whistle runs in the browser from the same three files NeuroLink ships (gitignored here).
for (const f of ["needle.js", "needle.wasm", "whistle.cact"]) {
  const src = `../../models/whistle/${f}`;
  if (!existsSync(`public/whistle/${f}`) && existsSync(src))
    copyFileSync(src, `public/whistle/${f}`);
}

// `pnpm dev` forwards the page's API calls (and the live-caption WebSocket) to a NeuroLink
// server, exactly as serve.mjs does in production, so config.js can use window.location.origin.
const target = process.env.NEUROLINK_URL ?? "http://127.0.0.1:8788";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    proxy: {
      "/api": { target, changeOrigin: true },
      "/v1": { target, changeOrigin: true, ws: true },
    },
  },
  build: { outDir: "dist", sourcemap: true, chunkSizeWarningLimit: 900 },
});
