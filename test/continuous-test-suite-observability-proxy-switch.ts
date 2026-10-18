#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability follow-up, the Langfuse off switch in the proxy
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924), finding K02: `LANGFUSE_ENABLED=false`
 * (also `0`, `off`, `no`) keeps Langfuse off although both keys are in the environment.
 * The SDK honours it; `neurolink proxy start` built its own Langfuse options object from the
 * keys alone, and a configuration passed in code wins over the switch, so the proxy kept
 * exporting prompts to Langfuse for someone who had switched it off. Every check prints one
 * line, `PROOF K02 PASS|FAIL <what is checked>`, and the suite exits non-zero when any check
 * fails.
 *
 * The same switch must hold wherever the keys come from the environment, not only in the
 * proxy: an `observability.langfuse` options object that leaves the keys to the environment
 * (only a `mask`, an `environment` name) is governed by it, while `langfuse: true`,
 * `enabled: true` and keys given in the options are explicit choices in code and win.
 *
 * It starts the BUILT command (`node dist/cli/index.js proxy start`) in a home directory with
 * no credentials and reads the startup line the proxy prints when Langfuse is on; the SDK cases
 * construct `NeuroLink` from the built entry in a fresh process and read `getLangfuseHealthStatus()`. Langfuse is
 * pointed at a closed local port, so nothing leaves the machine. It imports nothing from
 * `src/` or `dist/`, so Critical Rule 15 needs no exception; run `pnpm run build` first.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-proxy-switch.ts
 */
import "./helpers/credentialFreeEnv.js";
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(root, "dist/cli/index.js");
const STARTUP_LINE = "[proxy] Langfuse enabled";
const KEYS = {
  LANGFUSE_PUBLIC_KEY: "pk-lf-proxy-switch",
  LANGFUSE_SECRET_KEY: "sk-lf-proxy-switch",
};

if (!existsSync(CLI)) {
  console.error("CLI not built; run: pnpm run build");
  process.exit(1);
}

let failed = 0;
function proof(description: string, passed: boolean): void {
  if (!passed) {
    failed += 1;
  }
  console.log(`PROOF K02 ${passed ? "PASS" : "FAIL"} ${description}`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

/** Starts `proxy start` with the given environment and returns everything it printed before it was healthy. */
async function startProxy(env: Record<string, string>): Promise<{
  healthy: boolean;
  output: string;
}> {
  const port = await freePort();
  const closedPort = await freePort();
  const child = spawn(
    process.execPath,
    [CLI, "proxy", "start", "--port", String(port)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        NEUROLINK_PROXY_SHARE_LISTENER: "0",
        LANGFUSE_BASE_URL: `http://127.0.0.1:${closedPort}`,
        ...env,
      },
    },
  );
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  let healthy = false;
  try {
    const deadline = Date.now() + 90_000;
    while (!healthy && Date.now() < deadline) {
      try {
        healthy = (await fetch(`http://127.0.0.1:${port}/health`)).ok;
      } catch {
        // Not listening yet.
      }
      if (!healthy) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
    // The startup line is printed before the server listens, so it is already in `output`.
    await new Promise((resolve) => setTimeout(resolve, 500));
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 10_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  return { healthy, output };
}

const announces = (output: string): boolean => output.includes(STARTUP_LINE);

const control = await startProxy({ ...KEYS });
proof(
  "control: the proxy started and answers its health check",
  control.healthy,
);
proof(
  "control: with both keys and no switch the proxy announces Langfuse",
  announces(control.output),
);

const explicitOn = await startProxy({ ...KEYS, LANGFUSE_ENABLED: "true" });
proof(
  "LANGFUSE_ENABLED=true with both keys: the proxy announces Langfuse",
  explicitOn.healthy && announces(explicitOn.output),
);

for (const value of ["false", "0", "off", "no", "FALSE"]) {
  const run = await startProxy({ ...KEYS, LANGFUSE_ENABLED: value });
  proof(
    `LANGFUSE_ENABLED=${value} with both keys keeps Langfuse off in the proxy`,
    run.healthy && !announces(run.output),
  );
}

const noKeys = await startProxy({
  LANGFUSE_PUBLIC_KEY: "",
  LANGFUSE_SECRET_KEY: "",
});
proof(
  "control: with no keys the proxy does not announce Langfuse",
  noKeys.healthy && !announces(noKeys.output),
);

// ---------------------------------------------------------------------------
// The SDK: the same switch, for options objects that leave the keys to the environment
// ---------------------------------------------------------------------------

const SCENARIO = join(
  mkdtempSync(join(tmpdir(), "neurolink-obs-switch-")),
  "scenario.mjs",
);
writeFileSync(
  SCENARIO,
  `const { NeuroLink, getLangfuseHealthStatus } = await import(${JSON.stringify(
    pathToFileURL(join(root, "dist/index.js")).href,
  )});
const variants = {
  environment: { langfuse: { environment: "switch-test" } },
  mask: { langfuse: { mask: (text) => text } },
  true: { langfuse: true },
  "enabled-true": { langfuse: { enabled: true } },
  "keys-in-code": { langfuse: { publicKey: "pk-code", secretKey: "sk-code" } },
};
new NeuroLink({ observability: variants[process.env.OBS_VARIANT] });
console.log(JSON.stringify({ hasProcessor: getLangfuseHealthStatus().hasProcessor }));
process.exit(0);
`,
);

/** Whether Langfuse came up when `NeuroLink` is built with the named options object. */
async function sdkStartsLangfuse(
  variant: string,
  env: Record<string, string>,
): Promise<boolean | undefined> {
  const closedPort = await freePort();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [SCENARIO],
      {
        timeout: 60_000,
        env: {
          ...process.env,
          NEUROLINK_SKIP_MCP: "true",
          LANGFUSE_BASE_URL: `http://127.0.0.1:${closedPort}`,
          OBS_VARIANT: variant,
          ...env,
        },
      },
      (_error, stdout) => {
        const line = stdout.trim().split("\n").pop() ?? "";
        try {
          resolve((JSON.parse(line) as { hasProcessor: boolean }).hasProcessor);
        } catch {
          resolve(undefined);
        }
      },
    );
  });
}

proof(
  "control: an options object that leaves the keys to the environment starts Langfuse when no switch is set",
  (await sdkStartsLangfuse("environment", { ...KEYS })) === true &&
    (await sdkStartsLangfuse("mask", { ...KEYS })) === true,
);

for (const value of ["false", "off"]) {
  for (const variant of ["environment", "mask"]) {
    proof(
      `LANGFUSE_ENABLED=${value} keeps Langfuse off for an options object with only ${variant === "mask" ? "a mask" : "an environment name"}`,
      (await sdkStartsLangfuse(variant, {
        ...KEYS,
        LANGFUSE_ENABLED: value,
      })) === false,
    );
  }
  for (const variant of ["true", "enabled-true", "keys-in-code"]) {
    proof(
      `LANGFUSE_ENABLED=${value}: the explicit choice ${variant} in code still starts Langfuse`,
      (await sdkStartsLangfuse(variant, {
        ...KEYS,
        LANGFUSE_ENABLED: value,
      })) === true,
    );
  }
}
proof(
  "keys given in the options start Langfuse although the environment has none and the switch is off",
  (await sdkStartsLangfuse("keys-in-code", {
    LANGFUSE_PUBLIC_KEY: "",
    LANGFUSE_SECRET_KEY: "",
    LANGFUSE_ENABLED: "false",
  })) === true,
);

process.exit(failed === 0 ? 0 : 1);
