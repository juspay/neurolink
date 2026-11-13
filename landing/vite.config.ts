import adapter from "@sveltejs/adapter-vercel";
import { sveltekit } from "@sveltejs/kit/vite";
import { cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// satori 0.33 shapes text with harfbuzzjs, which reads hb.wasm from beside its
// own hb.js at runtime via a computed path. @vercel/nft cannot see that read,
// so the Vercel function ships hb.js without hb.wasm and /api/og dies with
// ENOENT -> 500. Copy the wasm next to every traced copy of hb.js.
const requireFromHere = createRequire(import.meta.url);

function findHarfbuzzDirs(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (name === "hb.js" && dir.endsWith("harfbuzzjs")) {
        found.push(dir);
      } else if (statSync(full).isDirectory()) {
        walk(full);
      }
    }
  };
  walk(root);
  return found;
}

function withHarfbuzzWasm(base: ReturnType<typeof adapter>) {
  return {
    ...base,
    async adapt(builder: Parameters<typeof base.adapt>[0]) {
      await base.adapt(builder);
      const functionsDir = join(process.cwd(), ".vercel/output/functions");
      if (!existsSync(functionsDir)) return;
      const satoriDir = dirname(requireFromHere.resolve("satori/package.json"));
      const wasm = join(
        dirname(
          requireFromHere.resolve("harfbuzzjs/package.json", {
            paths: [satoriDir],
          }),
        ),
        "hb.wasm",
      );
      for (const dir of findHarfbuzzDirs(functionsDir)) {
        cpSync(wasm, join(dir, "hb.wasm"));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: withHarfbuzzWasm(adapter()),
      alias: {
        // Kit 3 removed the built-in $lib; the config alias still works
        // (deprecated) and keeps every existing `$lib/...` import resolving.
        $lib: "./src/lib",
        "@/*": "./src/lib/*",
      },
      prerender: {
        // /discord, /docs/*, /sdk/*, /cli/*, /getting-started are Vercel edge
        // redirects (see vercel.json), not SvelteKit routes — they 404 during
        // prerender but resolve in production. Don't fail the build on them;
        // still fail on genuinely broken internal links.
        handleHttpError: ({ path, message }) => {
          if (path === "/discord" || path === "/getting-started") {
            return;
          }
          if (/^\/(docs|sdk|cli)(\/|$)/.test(path)) {
            return;
          }
          throw new Error(message);
        },
      },
    }),
  ],
  server: {
    port: 4000,
  },
});
