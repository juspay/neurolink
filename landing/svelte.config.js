import adapter from "@sveltejs/adapter-vercel";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
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
  },
};

export default config;
