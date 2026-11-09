import adapter from "@sveltejs/adapter-vercel";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
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
