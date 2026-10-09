/**
 * Credential-free proof pilot through the public SDK and built CLI.
 * Reuses acceptanceGateServer's OpenAI/Anthropic HTTP and SSE protocols.
 * No internal runtime imports. An installed consumer can select its own
 * package root with --package-root; that package must be an extracted tarball,
 * never a symlink back to this checkout. Receipt validation is a separate gate.
 */
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { runCommand, tempDir } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  GATE_MARKERS,
  GATE_EXACT_VALUE,
  GATE_STREAM_VALUE,
  GATE_SERVER_MODEL_SUFFIX,
  GATE_STRUCTURED_VALUE,
  GATE_TRUNCATED_VALUE,
  GATE_TOOL_NAME,
  GATE_TOOL_CONFIRM_PREFIX,
  GATE_THINKING_FULL,
  GATE_THINKING_ANSWER,
  startAcceptanceGateServer,
  type AcceptanceGateServer,
} from "./helpers/acceptanceGateServer.js";
import type { GenerateResult, StreamResult } from "../dist/index.js";

type PublicSDK = typeof import("../dist/index.js");
type ProofAssertion = {
  name: string;
  expected: unknown;
  observed: unknown;
  passed: boolean;
};
type Binding = {
  source_commit: string;
  base_commit: string;
  source_sha256: string;
  dist_sha256: string;
  tarball_sha256: string | null;
};
type CaseSpec = {
  id: string;
  surface: string;
  feature: string;
  provider: string;
  requested_model: string;
  allowed_served_models: string[];
  auth_route: string;
  expected_origin: string;
  mandatory: true;
  assertions: Record<string, unknown>;
  tool_nonce?: string;
};
type CaseResult = {
  id: string;
  surface: string;
  feature: string;
  provider: string;
  requested_model: string;
  served_model: string | null;
  auth_route: string;
  expected_origin: string;
  observed_origin: string | null;
  mode: string;
  state: "passed" | "failed";
  endpoint_requests: number;
  stream_fully_drained: boolean | null;
  assertions: ProofAssertion[];
  evidence: Array<{ path: string; sha256: string }>;
  limitation?: string;
  tool_nonce?: string;
  observed_tool_nonce?: string | null;
};
const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(row[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
const root = resolve(option("--package-root") ?? ".");
const output = resolve(
  option("--output") ?? tempDir("neurolink-provider-pilot-"),
);
const bindingPath = option("--binding");
assert.ok(bindingPath, "Pilot requires a frozen source/build binding");
const binding = JSON.parse(readFileSync(bindingPath, "utf8")) as Binding;
const mode = option("--package-root") ? "package" : "contract";
const onlyCase = option("--only");
if (mode === "package") {
  assert.equal(
    realpathSync(root),
    root,
    "Consumer package must be an extracted directory",
  );
  assert.ok(binding.tarball_sha256, "Consumer proof requires its tarball hash");
} else {
  assertDistFresh({
    entrypoints:
      onlyCase && !onlyCase.includes("cli.")
        ? ["dist/index.js"]
        : ["dist/index.js", "dist/cli/index.js"],
  });
}
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { main: string; name: string };
assert.equal(
  packageJson.name,
  "@juspay/neurolink",
  "Pilot package identity mismatch",
);
const sdk = (await import(
  pathToFileURL(join(root, packageJson.main)).href
)) as PublicSDK;
const cliPath = join(root, "dist/cli/index.js");
if (!onlyCase || onlyCase.includes("cli.")) {
  assert.ok(existsSync(cliPath), "Pilot built CLI is missing");
}
mkdirSync(output, { recursive: true });
const started = new Date().toISOString();
const specs: CaseSpec[] = [];
const results: CaseResult[] = [];
const servers: AcceptanceGateServer[] = [];
const profiles = [
  {
    provider: "openai",
    model: "gpt-4o-mini",
    protocol: "openai",
    key: "OPENAI_API_KEY",
    base: "OPENAI_BASE_URL",
    thinking: false,
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    protocol: "anthropic",
    key: "ANTHROPIC_API_KEY",
    base: "ANTHROPIC_BASE_URL",
    thinking: true,
  },
] as const;
type Profile = (typeof profiles)[number];
type PlannedCase = {
  spec: CaseSpec;
  server: AcceptanceGateServer;
  profile: Profile;
  kind: string;
};
const planned: PlannedCase[] = [];
const kinds = [
  ["generate", "sdk.generate", "FEATURE-01", "environment.api-key"],
  ["stream", "sdk.stream", "FEATURE-01", "environment.api-key"],
  ["cli.generate", "cli.generate", "FEATURE-01", "environment.api-key"],
  ["cli.stream", "cli.stream", "FEATURE-01", "environment.api-key"],
  ["tools", "sdk.generate", "FEATURE-04", "environment.api-key"],
  ["stream.tools", "sdk.stream", "FEATURE-04", "environment.api-key"],
  ["schema", "sdk.generate", "FEATURE-05", "environment.api-key"],
  ["truncation", "sdk.generate", "FEATURE-05", "environment.api-key"],
  ["instance", "sdk.generate", "FEATURE-10", "instance.api-key"],
  ["call", "sdk.generate", "FEATURE-10", "per-call.api-key"],
] as const;
for (const profile of profiles) {
  const server = await startAcceptanceGateServer(80);
  servers.push(server);
  const cells: ReadonlyArray<readonly [string, string, string, string]> =
    profile.thinking
      ? [
          ...kinds,
          ["thinking", "sdk.stream", "FEATURE-05", "environment.api-key"],
        ]
      : kinds;
  for (const [kind, surface, feature, auth] of cells) {
    const streamed = surface.endsWith("stream");
    const nonce = kind.includes("tools") ? randomUUID() : undefined;
    const expected = kind.includes("tools")
      ? `${GATE_TOOL_CONFIRM_PREFIX}${nonce}`
      : kind === "schema"
        ? GATE_STRUCTURED_VALUE
        : kind === "truncation"
          ? GATE_TRUNCATED_VALUE
          : kind === "thinking"
            ? GATE_THINKING_ANSWER
            : streamed
              ? GATE_STREAM_VALUE
              : GATE_EXACT_VALUE;
    const assertions: Record<string, unknown> = {
      output: expected,
      wire_model: profile.model,
      wire_protocol: profile.protocol,
      wire_auth: `pilot-fixture-${kind === "instance" ? "instance" : kind === "call" ? "call" : "env"}`,
    };
    if (surface.startsWith("sdk.")) {
      assertions.logical_end_count = 1;
      assertions.logical_end_provider = profile.provider;
      if (streamed) {
        assertions.stream_complete_count = 1;
      }
    }
    if (kind === "schema") {
      assertions.json_truncated = false;
    }
    if (kind === "truncation") {
      assertions.json_truncated = true;
      assertions.json_repaired = true;
    }
    if (kind === "thinking") {
      assertions.reasoning = GATE_THINKING_FULL;
    }
    if (nonce) {
      assertions.tool_execute_count = 1;
    }
    const served =
      (kind === "stream" || kind === "cli.stream") &&
      profile.protocol === "openai"
        ? profile.model + GATE_SERVER_MODEL_SUFFIX
        : profile.model;
    assertions.wire_served_model = served;
    const spec: CaseSpec = {
      id: `${profile.provider}.${kind}`,
      surface,
      feature,
      provider: profile.provider,
      requested_model: profile.model,
      allowed_served_models: [served],
      auth_route: auth,
      expected_origin: server.origin,
      mandatory: true,
      assertions,
      ...(nonce ? { tool_nonce: nonce } : {}),
    };
    specs.push(spec);
    planned.push({ spec, server, profile, kind });
  }
}
const limitations = [
  "Local fixtures establish protocol/public-path behavior; no current vendor availability or account acceptance is certified.",
  "Only OpenAI gpt-4o-mini and Anthropic claude-sonnet-4-6 with API-key routes are exercised; other profiles, models and OAuth/cloud auth routes remain unverified.",
  "CLI stream emits text and no public structured identity object; its model/protocol identity is observed independently at the fixture endpoint.",
  "MCP/HITL, media/vision/files, embeddings/RAG, decision/STT/TTS/realtime, middleware/workflows, fallback/abort/errors and full span-linkage remain separate proof cases.",
  "Installed proof certifies the local extracted artifact only; publication, registry availability and live acceptance remain separate.",
];
if (onlyCase) {
  assert.ok(
    planned.some((row) => row.spec.id === onlyCase),
    "Unknown pilot control case",
  );
  limitations.push(
    "A source-control run selected one case; missing mandatory cases deliberately prevent full pilot acceptance.",
  );
}
const contract = { ...binding, packet: "V02", mode, cases: specs, limitations };
writeFileSync(
  join(output, "case-contract.json"),
  JSON.stringify(contract, null, 2),
);
try {
  for (const { spec, server, profile, kind } of planned) {
    if (onlyCase && spec.id !== onlyCase) {
      continue;
    }
    const prior = server.requestCount();
    const observed: Record<string, unknown> = {};
    const events: Array<{
      name: string;
      provider?: unknown;
      model?: unknown;
      success?: unknown;
    }> = [];
    let served: string | null = null;
    let drained: boolean | null = null;
    let toolCount = 0;
    let executedNonce: string | null = null;
    let failure: string | undefined;
    const envKeys = [
      profile.key,
      profile.base,
      "NEUROLINK_SKIP_MCP",
      "NEUROLINK_DISABLE_BUILTIN_TOOLS",
      "AWS_EC2_METADATA_DISABLED",
    ];
    const saved = new Map(envKeys.map((name) => [name, process.env[name]]));
    process.env[profile.key] = "pilot-fixture-env";
    process.env[profile.base] =
      profile.protocol === "openai"
        ? server.openaiBaseURL
        : server.anthropicBaseURL;
    process.env.NEUROLINK_SKIP_MCP = "true";
    process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";
    process.env.AWS_EC2_METADATA_DISABLED = "true";
    const instanceCredential =
      kind === "instance" || kind === "call"
        ? {
            [profile.provider]: {
              apiKey: "pilot-fixture-instance",
              baseURL: process.env[profile.base],
            },
          }
        : undefined;
    const nl = new sdk.NeuroLink(
      instanceCredential ? { credentials: instanceCredential } : {},
    );
    for (const name of ["generation:end", "stream:complete"] as const) {
      nl.getEventEmitter()?.on(name, (value: unknown) => {
        const row = object(value);
        events.push({
          name,
          provider: row.provider,
          model: row.model,
          success: row.success,
        });
      });
    }
    try {
      const tool = spec.tool_nonce
        ? {
            [GATE_TOOL_NAME]: {
              description: "Execute the pilot nonce tool",
              inputSchema: sdk.jsonSchema<Record<string, never>>({
                type: "object",
                properties: {},
              }),
              execute: async () => {
                toolCount++;
                executedNonce = spec.tool_nonce ?? null;
                return { nonce: executedNonce };
              },
            },
          }
        : undefined;
      const marker = kind.includes("tools")
        ? GATE_MARKERS.TOOL
        : kind === "schema"
          ? GATE_MARKERS.STRUCTURED
          : kind === "truncation"
            ? GATE_MARKERS.TRUNCATED
            : kind === "thinking"
              ? GATE_MARKERS.THINKING
              : spec.surface.endsWith("stream")
                ? GATE_MARKERS.STREAM
                : GATE_MARKERS.EXACT;
      const common = {
        provider: profile.provider,
        model: profile.model,
        input: { text: marker },
        disableInternalFallback: true,
        disableTools: !tool,
        ...(tool ? { tools: tool } : {}),
        ...(kind === "call"
          ? {
              credentials: {
                [profile.provider]: {
                  apiKey: "pilot-fixture-call",
                  baseURL: process.env[profile.base],
                },
              },
            }
          : {}),
      };
      if (kind.startsWith("cli.")) {
        const home = tempDir("neurolink-pilot-cli-");
        const cli = await runCommand(
          "node",
          [
            cliPath,
            kind.slice(4),
            marker,
            "--provider",
            profile.provider,
            "--model",
            profile.model,
            "--quiet",
            "--disableTools",
            "--disable-internal-fallback",
            ...(kind === "cli.generate" ? ["--format", "json"] : []),
          ],
          { cwd: home, env: { ...process.env, HOME: home }, timeoutMs: 60_000 },
        );
        assert.equal(cli.exitCode, 0, "Pilot built CLI failed");
        if (kind === "cli.generate") {
          const parsed = JSON.parse(cli.stdout) as GenerateResult;
          observed.output = parsed.content.trim();
          served = parsed.model ?? null;
          assert.equal(
            parsed.provider,
            profile.provider,
            "CLI provider identity mismatch",
          );
        } else {
          observed.output = cli.stdout.trim();
          served =
            server.getAllRequests().slice(prior).at(-1)?.responseModel ?? null;
          drained = true;
        }
      } else if (spec.surface === "sdk.stream") {
        const result: StreamResult = await nl.stream({
          ...common,
          ...(kind === "thinking"
            ? { thinkingConfig: { enabled: true, budgetTokens: 2048 } }
            : {}),
        });
        let text = "";
        let reasoning = "";
        for await (const chunk of result.stream) {
          if ("content" in chunk) {
            text += chunk.content;
          }
          if ("reasoning" in chunk) {
            reasoning += chunk.reasoning ?? "";
          }
        }
        drained = true;
        observed.output = text;
        served = result.model ?? null;
        if (kind === "thinking") {
          observed.reasoning = reasoning;
        }
      } else {
        const result: GenerateResult = await nl.generate({
          ...common,
          ...(kind === "schema" || kind === "truncation"
            ? {
                schema: z.object({
                  status: z.string(),
                  count: z.number(),
                  tag: z.string(),
                }),
              }
            : {}),
        });
        observed.output =
          kind === "schema" || kind === "truncation"
            ? result.structuredData
            : result.content;
        served = result.model ?? null;
        if (kind === "schema") {
          observed.json_truncated = result.jsonTruncated === true;
        }
        if (kind === "truncation") {
          observed.json_truncated = result.jsonTruncated;
          observed.json_repaired = result.jsonRepaired;
        }
      }
      const wire = server.getAllRequests().slice(prior);
      assert.ok(wire.length > 0, "Pilot endpoint was never reached");
      assert.ok(
        wire.every((row) => object(row.bodyJson).model === profile.model),
        "Wire model identity mismatch",
      );
      assert.ok(
        wire.every((row) => row.protocol === profile.protocol),
        "Wire protocol identity mismatch",
      );
      assert.ok(
        wire.every((row) => row.fixtureAuthLabel === spec.assertions.wire_auth),
        "Wire auth route mismatch",
      );
      observed.wire_model = profile.model;
      observed.wire_protocol = profile.protocol;
      observed.wire_auth = wire[wire.length - 1].fixtureAuthLabel;
      observed.wire_served_model = wire[wire.length - 1].responseModel;
      if (spec.surface.startsWith("sdk.")) {
        const terminal = events.filter((e) => e.name === "generation:end");
        observed.logical_end_count = terminal.length;
        observed.logical_end_provider = terminal[0]?.provider;
        if (spec.surface.endsWith("stream")) {
          observed.stream_complete_count = events.filter(
            (e) => e.name === "stream:complete",
          ).length;
        }
      }
      if (spec.tool_nonce) {
        observed.tool_execute_count = toolCount;
      }
      for (const [name, expected] of Object.entries(spec.assertions)) {
        assert.deepEqual(
          observed[name],
          expected,
          `Pilot assertion mismatch: ${name}`,
        );
      }
      assert.ok(
        spec.allowed_served_models.includes(served ?? ""),
        "Public served model mismatch",
      );
    } catch (error) {
      failure = error instanceof Error ? error.message : "Pilot case threw";
    } finally {
      await nl.dispose();
      for (const [name, value] of saved) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
    const wire = server.getAllRequests().slice(prior);
    const evidence = {
      id: spec.id,
      mode,
      served_model: served,
      fully_drained: drained,
      fixture_origin: server.origin,
      requests: wire,
      observed_assertions: observed,
      events,
      tool_execute_count: toolCount,
      executed_nonce: executedNonce,
      ...(failure ? { failure } : {}),
    };
    const filename = `${spec.id}.json`;
    const bytes = JSON.stringify(evidence, null, 2);
    writeFileSync(join(output, filename), bytes);
    results.push({
      id: spec.id,
      surface: spec.surface,
      feature: spec.feature,
      provider: spec.provider,
      requested_model: spec.requested_model,
      served_model: served,
      auth_route: spec.auth_route,
      expected_origin: spec.expected_origin,
      observed_origin: wire.length ? server.origin : null,
      mode,
      state: failure ? "failed" : "passed",
      endpoint_requests: wire.length,
      stream_fully_drained: drained,
      assertions: Object.entries(spec.assertions).map(([name, expected]) => ({
        name,
        expected,
        observed: observed[name] ?? null,
        passed: canonical(expected) === canonical(observed[name] ?? null),
      })),
      evidence: [{ path: filename, sha256: digest(bytes) }],
      ...(failure ? { limitation: failure } : {}),
      ...(spec.tool_nonce
        ? { tool_nonce: spec.tool_nonce, observed_tool_nonce: executedNonce }
        : {}),
    });
    console.log(`${failure ? "FAIL" : "PASS"} ${spec.id}`);
  }
} finally {
  for (const server of servers) {
    await server.close();
  }
}
writeFileSync(
  join(output, "receipt.json"),
  JSON.stringify(
    {
      version: 1,
      packet: "V02",
      ...binding,
      mode,
      case_contract_sha256: digest(canonical(contract)),
      started_at: started,
      completed_at: new Date().toISOString(),
      cases: results,
      limitations,
    },
    null,
    2,
  ),
);
const failed = results.filter((row) => row.state !== "passed").length;
console.log(JSON.stringify({ mode, cases: results.length, failed, output }));
if (failed || results.length !== planned.length) {
  process.exitCode = 1;
}
