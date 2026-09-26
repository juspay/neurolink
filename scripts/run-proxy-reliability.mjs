/** Sequential isolated regression gates; no provider credentials or live proxy. */
import { spawnSync } from "node:child_process";

const checks = [
  ["vitest", "run", "--maxWorkers=1", "test/codex-quota-observability.test.ts"],
  // Not name-templated below because it is not a `proxy-*` suite: it covers the
  // Claude-on-Vertex passthrough that the Anthropic legs fall back to. It had no
  // npm script and no workflow reference, so its 51 cases never ran anywhere.
  ["tsx", "test/continuous-test-suite-vertex-anthropic-fallback.ts"],
  ...[
    "request-lifecycle",
    "http-disconnect",
    "route-accounting",
    "fallback-parent",
    "update-staging",
    "pressure-recovery",
    "token-budget",
    "capture-pipeline",
    "context-preflight",
    "fallback-errors",
    "telemetry-reconciliation",
  ].map((suite) => ["tsx", `test/continuous-test-suite-proxy-${suite}.ts`]),
];
for (const args of checks) {
  const result = spawnSync("pnpm", ["exec", ...args], {
    stdio: "inherit",
    timeout: 180_000,
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    if (result.error) {
      console.error(result.error.message);
    }
    process.exit(result.status ?? 1);
  }
}
