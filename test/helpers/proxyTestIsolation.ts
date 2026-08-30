import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch.bind(globalThis);
const isolatedHome = mkdtempSync(join(tmpdir(), "neurolink-vitest-home-"));

process.env.HOME = isolatedHome;
process.env.USERPROFILE = isolatedHome;
process.env.XDG_CONFIG_HOME = join(isolatedHome, ".config");
process.env.NEUROLINK_PROXY_TEST_ISOLATED = "1";

for (const name of [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
] as const) {
  delete process.env[name];
}

globalThis.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  const hostname = url.hostname
    .replace(/^\[([^\]]+)\]$/, "$1")
    .replace(/\.$/, "")
    .toLowerCase();
  const externalProvider =
    hostname === "api.anthropic.com" ||
    hostname === "api.openai.com" ||
    hostname === "auth.openai.com" ||
    hostname === "chatgpt.com" ||
    hostname.endsWith(".chatgpt.com") ||
    hostname.endsWith(".googleapis.com");
  const liveProxy =
    (hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1") &&
    url.port === "55669";
  if (externalProvider || liveProxy) {
    throw new Error(`Blocked network access from isolated test: ${url.origin}`);
  }
  return originalFetch(input, init);
};

process.once("exit", () => {
  rmSync(isolatedHome, { recursive: true, force: true });
});
