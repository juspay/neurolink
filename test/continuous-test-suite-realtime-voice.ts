#!/usr/bin/env tsx
/**
 * Continuous Test Suite - Realtime voice backends (Gemini Live and xAI Grok Voice)
 *
 * A realtime voice call runs on one speech-to-speech model. Gemini Live was the
 * only choice; `VOICE_REALTIME_BACKEND=xai` selects xAI's Grok Voice through
 * LiveKit's xAI plugin instead. This suite covers the backend choice, the model
 * factory and the agent wiring around it.
 *
 * WHAT THIS SUITE DOES NOT PROVE. It never talks to the real xAI service, so
 * nothing here is evidence that the xai backend works against it. The xAI cases
 * run against a stub WebSocket server on 127.0.0.1 and show what the LiveKit
 * plugin sends to whatever it is pointed at, and how this package reads the
 * events it is given. What the live service does (model ids, the session
 * layout, input transcription, usage, a refused key) was measured separately
 * with a real key on 2026-10-20; docs/features/livekit-voice-agent.md records
 * the results and what is still unmeasured. The stub events below reproduce the
 * shapes that run recorded, they are not a substitute for it.
 *
 * DETERMINISM (CLAUDE.md rule 15). Every case here is something a live call
 * cannot give: a fixed environment and config object, a recorded plugin
 * constructor (the options a plugin was handed, including keys whose value is
 * `undefined`, are invisible once the plugin has applied its defaults), a stub
 * server that captures the upgrade request and the first events byte for byte,
 * and a fake job context that stops the agent right after the step under test.
 * There is no key, no real endpoint and no model call. The code under test is
 * the package's shipped `./livekit` entry (`dist/voice/livekit/index.js`), so
 * run `pnpm run build` after editing src/. Type-only imports from src are
 * erased. Nothing here is imported from src at runtime, and the suite uses one
 * module graph (dist plus third-party packages).
 *
 * The recorded-constructor cases run in a child process
 * (test/fixtures/realtimeVoiceRecorder.mjs) that swaps both LiveKit plugins for
 * stand-ins which only record their options. The same child can run the agent
 * entry against a fake job context, which is how the config the entry merges
 * from code overrides and the environment is read at the point where the entry
 * hands it to the model factory, and the model and backend it gives the call
 * memory setup (a stand-in) are recorded.
 *
 * The tool case drives `buildRealtimeMcpTools` against a loopback MCP server
 * and sends the result to the xAI plugin's session, so the sanitizer is checked
 * at its real call site and not by calling it from the test.
 *
 * Run: pnpm run test:realtime-voice
 */
import "./helpers/credentialFreeEnv.js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { initializeLogger, llm } from "@livekit/agents";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import {
  assert,
  defineSuite,
  delay,
  runCommand,
  scaleTimeoutMs,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import * as livekit from "../dist/voice/livekit/index.js";
import type { RealtimeLlm } from "../src/lib/types/index.js";

assertDistFresh({ entrypoints: ["dist/voice/livekit/index.js"] });

const { test, runSuite } = defineSuite("Realtime voice backends", {
  offline: true,
});

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECORDER = join(
  REPO_ROOT,
  "test",
  "fixtures",
  "realtimeVoiceRecorder.mjs",
);
const REFUSED_UPGRADE = join(
  REPO_ROOT,
  "test",
  "fixtures",
  "realtimeRefusedUpgrade.mjs",
);

// Not credentials: arbitrary strings with no provider's key shape. They are
// distinct on purpose so a value that turns up somewhere it should not is
// traceable to the variable it came from.
const STUB_BEARER = "stub-bearer-for-loopback-only";
const AMBIENT_OPENAI_CANARY = "canary-ambient-openai-value";
const AMBIENT_OPENAI_URL = "wss://openai-canary.invalid/v1";
const PROMPT_CANARY = "canary-system-prompt-value";
const GEMINI_KEY_CANARY = "canary-gemini-value";
const GOOGLE_KEY_CANARY = "canary-google-value";
const GOOGLE_AI_KEY_CANARY = "canary-google-ai-value";

const GEMINI_DEFAULT_MODEL = "gemini-live-2.5-flash";
const XAI_DEFAULT_MODEL = "grok-voice-3.0";
const XAI_PLUGIN_DEFAULT_URL = "wss://api.x.ai/v1";
const DEFAULT_SYSTEM_PROMPT =
  "You are a concise voice assistant for a merchant dashboard. Keep replies short and spoken.";
const DEFAULT_GREETING =
  "Briefly greet the merchant and ask how you can help with their store today.";

/** Every variable the realtime config, the factory or the agent entry reads, plus the ambient ones that must never leak into xAI. */
const SUITE_ENV: readonly string[] = [
  "VOICE_REALTIME_BACKEND",
  "XAI_REALTIME_BASE_URL",
  "XAI_REALTIME_ALLOW_INSECURE",
  "XAI_API_KEY",
  "VOICE_LIVE_MODEL",
  "VOICE_S2S_VOICE",
  "VOICE_RESPONSE_MODALITY",
  "VERTEX_PROJECT",
  "VERTEX_LOCATION",
  "GOOGLE_AUTH_BREEZE_PROJECT_ID",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "VOICE_SYSTEM_PROMPT",
  "VOICE_GREETING",
  "VOICE_S2S_TOOLS",
  "LIGHTHOUSE_URL",
  "VOICE_MCP_URL",
  "VOICE_EMPTY_ROOM_GRACE_MS",
  "VOICE_JOIN_DEADLINE_MS",
  "VOICE_HITL_TIMEOUT_MS",
  "VOICE_METRICS_INTERVAL_MS",
  "REALTIME_RECORDER_AGENT",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_AUTH_CLIENT_EMAIL",
  "GOOGLE_AUTH_PRIVATE_KEY",
  "GOOGLE_AUTH_TYPE",
  "GOOGLE_AUTH_PRIVATE_KEY_ID",
  "GOOGLE_AUTH_TOKEN_URI",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "NEUROLINK_DEBUG",
  "NEUROLINK_LOG_LEVEL",
];

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const field = (value: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>(
    (current, key) => (isRecord(current) ? current[key] : undefined),
    value,
  );

/** The first path at which two values differ, without quoting either value. */
function firstDifference(
  actual: unknown,
  expected: unknown,
  path = "$",
): string | undefined {
  if (isDeepStrictEqual(actual, expected)) {
    return undefined;
  }
  if (isRecord(actual) && isRecord(expected)) {
    for (const key of new Set([
      ...Object.keys(actual),
      ...Object.keys(expected),
    ])) {
      const inner = firstDifference(
        actual[key],
        expected[key],
        `${path}.${key}`,
      );
      if (inner !== undefined) {
        return inner;
      }
    }
  }
  return path;
}

function assertSame(actual: unknown, expected: unknown, label: string): void {
  const difference = firstDifference(actual, expected);
  assert(difference === undefined, `${label} differs at ${difference}`);
}

async function withEnv<T>(
  vars: Readonly<Record<string, string | undefined>>,
  body: () => Promise<T> | T,
): Promise<T> {
  const names = new Set<string>([...SUITE_ENV, ...Object.keys(vars)]);
  const saved = new Map<string, string | undefined>(
    [...names].map((name) => [name, process.env[name]]),
  );
  for (const name of SUITE_ENV) {
    delete process.env[name];
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    return await body();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

async function waitFor(
  condition: () => boolean,
  label: string,
  timeoutMs = scaleTimeoutMs(5_000),
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await delay(10);
  }
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** `value`, or a failure with `message` when it is undefined. */
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** The LiveKit model behind the factory's structural return type. */
function liveKitModel(value: RealtimeLlm, message: string): llm.RealtimeModel {
  if (!(value instanceof llm.RealtimeModel)) {
    throw new Error(message);
  }
  return value;
}

async function rejection(
  body: () => Promise<unknown> | unknown,
): Promise<string> {
  try {
    await body();
  } catch (error) {
    return messageOf(error);
  }
  throw new Error("expected a rejection and the call returned normally");
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const resolveConfig = (
  vars: Readonly<Record<string, string | undefined>>,
  options?: Parameters<typeof livekit.resolveRealtimeVoiceConfig>[0],
) => withEnv(vars, () => livekit.resolveRealtimeVoiceConfig(options));

const GEMINI_DEFAULT_CONFIG = {
  backend: "gemini",
  project: undefined,
  location: "global",
  model: GEMINI_DEFAULT_MODEL,
  voice: undefined,
  xaiBaseURL: undefined,
  responseModality: "AUDIO",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  greeting: DEFAULT_GREETING,
  toolsEnabled: false,
  mcpUrl: "http://localhost:5173/ai/mcp/v2",
  emptyRoomGraceMs: 30_000,
  joinDeadlineMs: 60_000,
  hitlTimeoutMs: 45_000,
  metricsIntervalMs: 10_000,
};

async function configSection(): Promise<void> {
  await test("config: with nothing set the backend is gemini and the whole config object is the one it always was", async () => {
    assertSame(
      await resolveConfig({}),
      GEMINI_DEFAULT_CONFIG,
      "default config",
    );
  });

  await test("config: a fully set gemini environment resolves every field, the project through its fallback chain", async () => {
    const vars = {
      VERTEX_LOCATION: "us-central1",
      VOICE_LIVE_MODEL: "gemini-live-custom",
      VOICE_S2S_VOICE: "Kore",
      VOICE_RESPONSE_MODALITY: "text",
      VOICE_SYSTEM_PROMPT: "Answer briefly.",
      VOICE_GREETING: "Say hello.",
      VOICE_S2S_TOOLS: "TRUE",
      LIGHTHOUSE_URL: "http://lighthouse.test",
      VOICE_EMPTY_ROOM_GRACE_MS: "1000",
      VOICE_JOIN_DEADLINE_MS: "2000",
      VOICE_HITL_TIMEOUT_MS: "3000",
      VOICE_METRICS_INTERVAL_MS: "4000",
    };
    const expected = {
      ...GEMINI_DEFAULT_CONFIG,
      location: "us-central1",
      model: "gemini-live-custom",
      voice: "Kore",
      responseModality: "TEXT",
      systemPrompt: "Answer briefly.",
      greeting: "Say hello.",
      toolsEnabled: true,
      mcpUrl: "http://lighthouse.test/ai/mcp/v2",
      emptyRoomGraceMs: 1000,
      joinDeadlineMs: 2000,
      hitlTimeoutMs: 3000,
      metricsIntervalMs: 4000,
    };
    assertSame(
      await resolveConfig({ ...vars, VERTEX_PROJECT: "project-a" }),
      { ...expected, project: "project-a" },
      "VERTEX_PROJECT",
    );
    assertSame(
      await resolveConfig({
        ...vars,
        GOOGLE_AUTH_BREEZE_PROJECT_ID: "project-b",
        GOOGLE_CLOUD_PROJECT_ID: "project-c",
      }),
      { ...expected, project: "project-b" },
      "GOOGLE_AUTH_BREEZE_PROJECT_ID",
    );
    assertSame(
      await resolveConfig({ ...vars, GOOGLE_CLOUD_PROJECT_ID: "project-c" }),
      { ...expected, project: "project-c" },
      "GOOGLE_CLOUD_PROJECT_ID",
    );
  });

  await test("config: VOICE_REALTIME_BACKEND is case-insensitive and a blank value means gemini", async () => {
    const table: ReadonlyArray<readonly [string | undefined, string]> = [
      [undefined, "gemini"],
      ["", "gemini"],
      ["   ", "gemini"],
      ["gemini", "gemini"],
      ["GEMINI", "gemini"],
      ["  Gemini  ", "gemini"],
      ["xai", "xai"],
      ["XAI", "xai"],
      [" xAI\n", "xai"],
    ];
    for (const [value, backend] of table) {
      const config = await resolveConfig({ VOICE_REALTIME_BACKEND: value });
      assert(
        config.backend === backend,
        `backend table row ${JSON.stringify(value)} did not resolve to ${backend}`,
      );
    }
  });

  await test("config: any other backend value throws an error naming the variable and the two choices, without repeating the value or the rest of the environment", async () => {
    for (const value of ["openai", "grok", "xai,gemini", "none", "0"]) {
      const message = await rejection(() =>
        resolveConfig({
          VOICE_REALTIME_BACKEND: value,
          XAI_API_KEY: STUB_BEARER,
          VOICE_SYSTEM_PROMPT: PROMPT_CANARY,
          OPENAI_API_KEY: AMBIENT_OPENAI_CANARY,
        }),
      );
      assert(
        message.includes("VOICE_REALTIME_BACKEND"),
        "the error does not name VOICE_REALTIME_BACKEND",
      );
      assert(
        message.includes("gemini") && message.includes("xai"),
        "the error does not list both allowed values",
      );
      assert(!message.includes(value), "the error repeats the rejected value");
      for (const secret of [
        STUB_BEARER,
        PROMPT_CANARY,
        AMBIENT_OPENAI_CANARY,
      ]) {
        assert(
          !message.includes(secret),
          "the error carries a value from the environment",
        );
      }
    }
  });

  await test("config: the xai backend defaults to grok-voice-3.0 and VOICE_LIVE_MODEL overrides the default of either backend", async () => {
    const xai = await resolveConfig({ VOICE_REALTIME_BACKEND: "xai" });
    assert(
      xai.model === XAI_DEFAULT_MODEL,
      "xai default model is not grok-voice-3.0",
    );
    const xaiOverride = await resolveConfig({
      VOICE_REALTIME_BACKEND: "xai",
      VOICE_LIVE_MODEL: "grok-voice-latest",
    });
    assert(
      xaiOverride.model === "grok-voice-latest",
      "VOICE_LIVE_MODEL did not override the xai default",
    );
    const geminiOverride = await resolveConfig({
      VOICE_LIVE_MODEL: "gemini-live-custom",
    });
    assert(
      geminiOverride.model === "gemini-live-custom",
      "VOICE_LIVE_MODEL did not override the gemini default",
    );
    const geminiExplicit = await resolveConfig({
      VOICE_REALTIME_BACKEND: "gemini",
    });
    assert(
      geminiExplicit.model === GEMINI_DEFAULT_MODEL,
      "an explicit gemini backend changed the gemini default",
    );
  });

  await test("config: a backend passed to the resolver beats the environment and brings that backend's own model default", async () => {
    const forced = await resolveConfig({}, { backend: "xai" });
    assert(forced.backend === "xai", "the passed backend was ignored");
    assert(
      forced.model === XAI_DEFAULT_MODEL,
      "the passed backend kept the gemini model default",
    );
    const back = await resolveConfig(
      { VOICE_REALTIME_BACKEND: "xai" },
      { backend: "gemini" },
    );
    assert(
      back.backend === "gemini",
      "the environment beat the passed backend",
    );
    assert(
      back.model === GEMINI_DEFAULT_MODEL,
      "the passed backend kept the xai model default",
    );
    const bypass = await resolveConfig(
      { VOICE_REALTIME_BACKEND: "not-a-backend" },
      { backend: "xai" },
    );
    assert(
      bypass.backend === "xai",
      "a bad environment value was read although a backend was passed",
    );
  });

  await test("config: a backend passed in code that is not gemini or xai is refused before it can pick a branch, without being repeated", async () => {
    // A plain-JavaScript caller is not held by the type; without this guard a
    // typo would go down the xai branch and fail on a missing key instead.
    for (const value of ["GEMINI", "gemini-live", "openai", ""]) {
      const bad: Parameters<typeof livekit.resolveRealtimeVoiceConfig>[0] =
        JSON.parse(JSON.stringify({ backend: value }));
      const message = await rejection(() => resolveConfig({}, bad));
      assert(
        message.includes("gemini") && message.includes("xai"),
        "the error does not list both allowed values",
      );
      assert(
        value === "" || !message.includes(value),
        "the error repeats the rejected value",
      );
    }
  });

  await test("config: XAI_REALTIME_BASE_URL is read as the xai base URL, blank means unset, and anything but a ws or wss URL is refused without being repeated", async () => {
    const set = await resolveConfig({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_REALTIME_BASE_URL: "  ws://127.0.0.1:9/v1  ",
    });
    assert(
      set.xaiBaseURL === "ws://127.0.0.1:9/v1",
      "the base URL was not read and trimmed",
    );
    const secure = await resolveConfig({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_REALTIME_BASE_URL: "wss://gateway.example.test/v1",
    });
    assert(
      secure.xaiBaseURL === "wss://gateway.example.test/v1",
      "a wss URL was not accepted",
    );
    for (const blank of [undefined, "", "   "]) {
      const config = await resolveConfig({
        VOICE_REALTIME_BACKEND: "xai",
        XAI_REALTIME_BASE_URL: blank,
      });
      assert(
        config.xaiBaseURL === undefined,
        "a blank base URL was not read as unset",
      );
    }
    for (const bad of [
      "not a url",
      "https://gateway.example.test/v1",
      "ftp://x.test",
      "gateway.example.test",
    ]) {
      const message = await rejection(() =>
        resolveConfig({
          VOICE_REALTIME_BACKEND: "xai",
          XAI_REALTIME_BASE_URL: bad,
        }),
      );
      assert(
        message.includes("XAI_REALTIME_BASE_URL"),
        "the error does not name XAI_REALTIME_BASE_URL",
      );
      assert(!message.includes(bad), "the error repeats the rejected URL");
    }
  });

  await test("config: a caller's xaiBaseURL replaces XAI_REALTIME_BASE_URL after the same ws or wss check, blank leaves the variable, and anything else is refused without being repeated", async () => {
    const fromEnv = "ws://127.0.0.1:9/env";
    const replaced = await resolveConfig(
      { VOICE_REALTIME_BACKEND: "xai", XAI_REALTIME_BASE_URL: fromEnv },
      { xaiBaseURL: "  wss://gateway.example.test/v1  " },
    );
    assert(
      replaced.xaiBaseURL === "wss://gateway.example.test/v1",
      "the caller's base URL was not trimmed and used over the variable",
    );
    for (const blank of ["", "   "]) {
      const kept = await resolveConfig(
        { VOICE_REALTIME_BACKEND: "xai", XAI_REALTIME_BASE_URL: fromEnv },
        { xaiBaseURL: blank },
      );
      assert(
        kept.xaiBaseURL === fromEnv,
        "a blank caller base URL did not leave the variable in place",
      );
    }
    for (const bad of [
      "not a url",
      "https://gateway.example.test/v1",
      "ftp://x.test",
      "gateway.example.test",
    ]) {
      const message = await rejection(() =>
        resolveConfig(
          { VOICE_REALTIME_BACKEND: "xai", XAI_REALTIME_BASE_URL: fromEnv },
          { xaiBaseURL: bad },
        ),
      );
      assert(
        message.includes("xaiBaseURL"),
        "the error does not name xaiBaseURL",
      );
      assert(!message.includes(bad), "the error repeats the rejected URL");
    }
    const viaAgent = await rejection(() =>
      withEnv({ VOICE_REALTIME_BACKEND: "xai" }, () =>
        livekit.defineRealtimeVoiceAgent({
          xaiBaseURL: "https://gateway.example.test/v1",
        }),
      ),
    );
    assert(
      viaAgent.includes("xaiBaseURL"),
      "defineRealtimeVoiceAgent accepted an https base URL",
    );
  });

  await test("config: a valid caller xaiBaseURL wins over an XAI_REALTIME_BASE_URL that would be refused, because the variable is then not read", async () => {
    const caller = "wss://gateway.example.test/v1";
    for (const fromEnv of [
      "https://gateway.example.test/v1",
      "not a url",
      "ws://gateway.example.test/v1",
    ]) {
      const config = await resolveConfig(
        { VOICE_REALTIME_BACKEND: "xai", XAI_REALTIME_BASE_URL: fromEnv },
        { xaiBaseURL: caller },
      );
      assert(
        config.xaiBaseURL === caller,
        "the caller's base URL did not win over a refused variable",
      );
    }
  });

  await test("config: the base URL is checked whatever the backend, so a refused XAI_REALTIME_BASE_URL stops a gemini deployment too and a valid caller xaiBaseURL does not", async () => {
    const refused = [
      "https://gateway.example.test/v1",
      "ws://gateway.example.test/v1",
    ];
    for (const fromEnv of refused) {
      const viaVariable = await rejection(() =>
        resolveConfig({
          VOICE_REALTIME_BACKEND: "gemini",
          XAI_REALTIME_BASE_URL: fromEnv,
        }),
      );
      assert(
        viaVariable.includes("XAI_REALTIME_BASE_URL"),
        "a gemini environment with a refused base URL was not stopped by it",
      );
      const viaOverride = await rejection(() =>
        resolveConfig(
          { XAI_REALTIME_BASE_URL: fromEnv },
          { backend: "gemini" },
        ),
      );
      assert(
        viaOverride.includes("XAI_REALTIME_BASE_URL"),
        "a passed gemini backend with a refused base URL was not stopped by it",
      );
      assert(
        !viaOverride.includes(fromEnv),
        "the error repeats the refused URL",
      );
      const viaAgent = await rejection(() =>
        withEnv({ XAI_REALTIME_BASE_URL: fromEnv }, () =>
          livekit.defineRealtimeVoiceAgent({ backend: "gemini" }),
        ),
      );
      assert(
        viaAgent.includes("XAI_REALTIME_BASE_URL"),
        "defineRealtimeVoiceAgent started a gemini agent with a refused base URL",
      );
      const rescued = await resolveConfig(
        { XAI_REALTIME_BASE_URL: fromEnv },
        { backend: "gemini", xaiBaseURL: "wss://gateway.example.test/v1" },
      );
      assert(
        rescued.backend === "gemini" &&
          rescued.xaiBaseURL === "wss://gateway.example.test/v1",
        "a valid caller base URL did not clear a refused variable for gemini",
      );
    }
  });

  await test("config: a ws:// URL to a host other than loopback is refused unless XAI_REALTIME_ALLOW_INSECURE is true, for the variable and for xaiBaseURL, and loopback ws:// and wss:// are accepted", async () => {
    const before = process.env.XAI_REALTIME_ALLOW_INSECURE;
    const crossHost = [
      "ws://gateway.example.test/v1",
      "ws://gateway.example.test:8080/v1",
      "ws://10.0.0.5:9/v1",
      "ws://[2001:db8::1]:9/v1",
      "ws://localhost.example.test/v1",
      "ws://127.0.0.1.example.test/v1",
      "ws://127.0.0.1@gateway.example.test/v1",
      "ws://localhost@gateway.example.test/v1",
      "ws://126.255.255.255/v1",
      "ws://128.0.0.1/v1",
      "ws://[::ffff:10.0.0.5]/v1",
    ];
    const loopback = [
      "ws://localhost:9/v1",
      "ws://LOCALHOST:9/v1",
      "ws://127.0.0.1:9/v1",
      "ws://127.255.255.254:9/v1",
      "ws://127.1:9/v1",
      "ws://[::1]:9/v1",
    ];
    const secure = [
      "wss://gateway.example.test/v1",
      "wss://10.0.0.5:9/v1",
      "wss://localhost:9/v1",
    ];
    const offOptIns = [undefined, "", "false", "1", "yes", "truthy"];

    for (const url of crossHost) {
      for (const optIn of offOptIns) {
        const viaVariable = await rejection(() =>
          resolveConfig({
            VOICE_REALTIME_BACKEND: "xai",
            XAI_REALTIME_BASE_URL: url,
            XAI_REALTIME_ALLOW_INSECURE: optIn,
          }),
        );
        assert(
          viaVariable.includes("XAI_REALTIME_BASE_URL"),
          "the error does not name XAI_REALTIME_BASE_URL",
        );
        assert(
          viaVariable.includes("XAI_REALTIME_ALLOW_INSECURE"),
          "the error does not name the opt-in variable",
        );
        assert(
          !viaVariable.includes(url) &&
            !viaVariable.includes(new URL(url).hostname),
          "the error repeats the refused URL or its host",
        );
        const viaCaller = await rejection(() =>
          resolveConfig(
            {
              VOICE_REALTIME_BACKEND: "xai",
              XAI_REALTIME_ALLOW_INSECURE: optIn,
            },
            { xaiBaseURL: url },
          ),
        );
        assert(
          viaCaller.includes("xaiBaseURL") &&
            viaCaller.includes("XAI_REALTIME_ALLOW_INSECURE"),
          "the error for a caller URL does not name xaiBaseURL and the opt-in",
        );
        assert(
          !viaCaller.includes(url) &&
            !viaCaller.includes(new URL(url).hostname),
          "the error for a caller URL repeats the refused URL or its host",
        );
      }
      for (const optIn of ["true", "TRUE", "  True  "]) {
        const viaVariable = await resolveConfig({
          VOICE_REALTIME_BACKEND: "xai",
          XAI_REALTIME_BASE_URL: url,
          XAI_REALTIME_ALLOW_INSECURE: optIn,
        });
        assert(
          viaVariable.xaiBaseURL === url,
          "the opt-in did not let the variable's ws:// URL through",
        );
        const viaCaller = await resolveConfig(
          { VOICE_REALTIME_BACKEND: "xai", XAI_REALTIME_ALLOW_INSECURE: optIn },
          { xaiBaseURL: url },
        );
        assert(
          viaCaller.xaiBaseURL === url,
          "the opt-in did not let the caller's ws:// URL through",
        );
      }
    }

    for (const url of [...loopback, ...secure]) {
      const viaVariable = await resolveConfig({
        VOICE_REALTIME_BACKEND: "xai",
        XAI_REALTIME_BASE_URL: url,
      });
      assert(
        viaVariable.xaiBaseURL === url,
        "a loopback ws:// or a wss:// variable was refused without the opt-in",
      );
      const viaCaller = await resolveConfig(
        { VOICE_REALTIME_BACKEND: "xai" },
        { xaiBaseURL: url },
      );
      assert(
        viaCaller.xaiBaseURL === url,
        "a loopback ws:// or a wss:// caller URL was refused without the opt-in",
      );
    }

    const notWebSocket = await rejection(() =>
      resolveConfig({
        VOICE_REALTIME_BACKEND: "xai",
        XAI_REALTIME_BASE_URL: "https://gateway.example.test/v1",
        XAI_REALTIME_ALLOW_INSECURE: "true",
      }),
    );
    assert(
      notWebSocket.includes("XAI_REALTIME_BASE_URL") &&
        !notWebSocket.includes("XAI_REALTIME_ALLOW_INSECURE"),
      "the opt-in changed how a non-WebSocket URL is refused",
    );

    const viaAgent = await rejection(() =>
      withEnv({ VOICE_REALTIME_BACKEND: "xai" }, () =>
        livekit.defineRealtimeVoiceAgent({
          xaiBaseURL: "ws://gateway.example.test/v1",
        }),
      ),
    );
    assert(
      viaAgent.includes("xaiBaseURL") &&
        viaAgent.includes("XAI_REALTIME_ALLOW_INSECURE"),
      "defineRealtimeVoiceAgent accepted a cross-host ws:// base URL",
    );

    assert(
      process.env.XAI_REALTIME_ALLOW_INSECURE === before,
      "XAI_REALTIME_ALLOW_INSECURE was not restored",
    );
  });

  await test("config: VOICE_S2S_VOICE is the voice of either backend and a blank value leaves it for the plugin's own default", async () => {
    for (const backend of ["gemini", "xai"]) {
      const named = await resolveConfig({
        VOICE_REALTIME_BACKEND: backend,
        VOICE_S2S_VOICE: "  eve ",
      });
      assert(
        named.voice === "eve",
        `${backend}: the voice was not read and trimmed`,
      );
      const blank = await resolveConfig({
        VOICE_REALTIME_BACKEND: backend,
        VOICE_S2S_VOICE: "  ",
      });
      assert(
        blank.voice === undefined,
        `${backend}: a blank voice was not read as unset`,
      );
    }
  });

  await test("config: the xai config object is the gemini one with the backend, the model and the base URL changed, and carries no key", async () => {
    const config = await resolveConfig({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_API_KEY: STUB_BEARER,
      XAI_REALTIME_BASE_URL: "ws://127.0.0.1:9/v1",
    });
    assertSame(
      config,
      {
        ...GEMINI_DEFAULT_CONFIG,
        backend: "xai",
        model: XAI_DEFAULT_MODEL,
        xaiBaseURL: "ws://127.0.0.1:9/v1",
      },
      "xai default config",
    );
    assert(
      !JSON.stringify(config).includes(STUB_BEARER),
      "the resolved config carries the xai key",
    );
  });
}

// ---------------------------------------------------------------------------
// Recorded constructor options (child process)
// ---------------------------------------------------------------------------

const recordedSchema = z.object({
  plugin: z.string(),
  keys: z.array(z.string()),
  options: z.record(z.string(), z.unknown()),
});
const outcomeSchema = z.object({
  ok: z.boolean(),
  recorded: z.array(recordedSchema),
  memoryCalls: z.array(z.object({ call: z.unknown() })),
  message: z.string().optional(),
});
type Outcome = z.infer<typeof outcomeSchema>;

/** Run a fixture script in a child with the suite's variables cleared and `vars` set; returns the JSON after its `RESULT ` line. */
async function runFixture(
  script: string,
  vars: Readonly<Record<string, string | undefined>>,
): Promise<{ result: unknown; raw: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of SUITE_ENV) {
    delete env[name];
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value !== undefined) {
      env[name] = value;
    }
  }
  const output = await runCommand(process.execPath, [script], {
    cwd: REPO_ROOT,
    env,
    timeoutMs: scaleTimeoutMs(60_000),
  });
  const line = required(
    output.stdout.split("\n").find((entry) => entry.startsWith("RESULT ")),
    "the fixture child printed no result",
  );
  return {
    result: JSON.parse(line.slice("RESULT ".length)),
    raw: output.stdout + output.stderr,
  };
}

async function record(
  vars: Readonly<Record<string, string | undefined>>,
): Promise<{ outcome: Outcome; raw: string }> {
  const { result, raw } = await runFixture(RECORDER, vars);
  return { outcome: outcomeSchema.parse(result), raw };
}

const sortedKeys = (keys: readonly string[]): string[] => [...keys].sort();

async function geminiFactorySection(): Promise<void> {
  await test("gemini factory: default environment hands the plugin exactly the options the agent always built", async () => {
    const { outcome } = await record({});
    assert(outcome.ok, "the gemini factory failed with defaults");
    assert(
      outcome.recorded.length === 1,
      "the gemini factory did not build exactly one model",
    );
    const [call] = outcome.recorded;
    assert(
      call.plugin === "google",
      "the gemini factory did not use the google plugin",
    );
    assertSame(
      sortedKeys(call.keys),
      sortedKeys([
        "vertexai",
        "model",
        "inputAudioTranscription",
        "outputAudioTranscription",
        "modalities",
        "location",
      ]),
      "gemini default option keys",
    );
    assertSame(
      call.options,
      {
        vertexai: true,
        model: GEMINI_DEFAULT_MODEL,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        modalities: ["AUDIO"],
        location: "global",
      },
      "gemini default options",
    );
  });

  await test("gemini factory: project, location, voice, model and modality come through, and an unknown modality leaves modalities to the plugin", async () => {
    const full = await record({
      VERTEX_PROJECT: "project-a",
      VERTEX_LOCATION: "us-central1",
      VOICE_LIVE_MODEL: "gemini-live-custom",
      VOICE_S2S_VOICE: "Kore",
      VOICE_RESPONSE_MODALITY: "text",
    });
    assert(
      full.outcome.ok,
      "the gemini factory failed with a full environment",
    );
    assertSame(
      full.outcome.recorded[0]?.options,
      {
        vertexai: true,
        model: "gemini-live-custom",
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        modalities: ["TEXT"],
        project: "project-a",
        location: "us-central1",
        voice: "Kore",
      },
      "gemini full options",
    );
    const unknown = await record({ VOICE_RESPONSE_MODALITY: "banana" });
    assert(
      unknown.outcome.ok,
      "the gemini factory failed with an unknown modality",
    );
    assert(
      !(unknown.outcome.recorded[0]?.keys ?? []).includes("modalities"),
      "an unknown modality was passed on instead of left to the plugin",
    );
  });

  await test("gemini factory: the explicit gemini backend builds the same options as the default", async () => {
    const implicit = await record({ VERTEX_PROJECT: "project-a" });
    const explicit = await record({
      VERTEX_PROJECT: "project-a",
      VOICE_REALTIME_BACKEND: "gemini",
    });
    assert(implicit.outcome.ok, "the gemini factory failed with a project set");
    assertSame(
      explicit.outcome,
      implicit.outcome,
      "explicit versus implicit gemini",
    );
  });

  await test("gemini factory: builds a real LiveKit realtime model through the shipped entry", async () => {
    await withEnv({ VERTEX_PROJECT: "project-a" }, async () => {
      const model = liveKitModel(
        await livekit.createRealtimeLlm(livekit.resolveRealtimeVoiceConfig()),
        "the gemini factory did not return a LiveKit realtime model",
      );
      assert(
        model.label() === "google.RealtimeModel",
        "the gemini factory did not return the google model",
      );
      assert(
        model.model === GEMINI_DEFAULT_MODEL,
        "the gemini model id is not the configured one",
      );
      await model.close();
    });
  });
}

async function xaiFactorySection(): Promise<void> {
  await test("xai factory: without XAI_API_KEY it fails early naming the variable, and no ambient key or value is repeated or used", async () => {
    const { outcome, raw } = await record({
      VOICE_REALTIME_BACKEND: "xai",
      OPENAI_API_KEY: AMBIENT_OPENAI_CANARY,
      OPENAI_BASE_URL: AMBIENT_OPENAI_URL,
      VOICE_SYSTEM_PROMPT: PROMPT_CANARY,
    });
    assert(!outcome.ok, "the xai factory built a model without XAI_API_KEY");
    assert(
      outcome.recorded.length === 0,
      "the xai factory reached the plugin without XAI_API_KEY",
    );
    assert(
      (outcome.message ?? "").includes("XAI_API_KEY"),
      "the error does not name XAI_API_KEY",
    );
    for (const secret of [
      AMBIENT_OPENAI_CANARY,
      AMBIENT_OPENAI_URL,
      PROMPT_CANARY,
    ]) {
      assert(
        !raw.includes(secret),
        "an ambient value reached the child's output",
      );
    }
  });

  await test("xai factory: a blank or whitespace XAI_API_KEY is a missing key", async () => {
    for (const blank of ["", "   ", "\t\n"]) {
      const { outcome } = await record({
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: blank,
      });
      assert(
        !outcome.ok && outcome.recorded.length === 0,
        "a blank key reached the plugin",
      );
      assert(
        (outcome.message ?? "").includes("XAI_API_KEY"),
        "the error does not name XAI_API_KEY",
      );
    }
  });

  await test("xai factory: the plugin is handed the model and an erased input transcription when no voice or base URL is set, and never a key", async () => {
    const { outcome, raw } = await record({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_API_KEY: STUB_BEARER,
      OPENAI_API_KEY: AMBIENT_OPENAI_CANARY,
      OPENAI_BASE_URL: AMBIENT_OPENAI_URL,
    });
    assert(outcome.ok, "the xai factory failed with a key set");
    assert(
      outcome.recorded.length === 1,
      "the xai factory did not build exactly one model",
    );
    const [call] = outcome.recorded;
    assert(call.plugin === "xai", "the xai factory did not use the xai plugin");
    // The key is passed holding `undefined`, which is what erases the plugin's
    // OpenAI transcription default. JSON drops it, so it shows in `keys` only.
    assertSame(
      sortedKeys(call.keys),
      ["inputAudioTranscription", "model"],
      "xai default option keys",
    );
    assertSame(
      call.options,
      { model: XAI_DEFAULT_MODEL },
      "xai default options",
    );
    assert(
      !raw.includes(STUB_BEARER),
      "the xai key reached the child's output",
    );
  });

  await test("xai factory: voice and base URL are passed when set, still without a key", async () => {
    const { outcome, raw } = await record({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_API_KEY: STUB_BEARER,
      VOICE_LIVE_MODEL: "grok-voice-latest",
      VOICE_S2S_VOICE: "eve",
      XAI_REALTIME_BASE_URL: "ws://127.0.0.1:9/v1",
      VERTEX_PROJECT: "project-a",
      VERTEX_LOCATION: "us-central1",
      VOICE_RESPONSE_MODALITY: "TEXT",
    });
    assert(outcome.ok, "the xai factory failed with voice and base URL set");
    const [call] = outcome.recorded;
    assertSame(
      sortedKeys(call?.keys ?? []),
      ["baseURL", "inputAudioTranscription", "model", "voice"],
      "xai full option keys",
    );
    assertSame(
      call?.options,
      {
        model: "grok-voice-latest",
        voice: "eve",
        baseURL: "ws://127.0.0.1:9/v1",
      },
      "xai full options",
    );
    assert(
      !raw.includes(STUB_BEARER),
      "the xai key reached the child's output",
    );
  });

  await test("xai factory: creating the model leaves the Gemini environment alone and writes no Vertex ADC file", async () => {
    await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: STUB_BEARER,
        ...ADC_FIELDS,
        ...GEMINI_ENV_CANARIES,
      },
      async () => {
        const model = liveKitModel(
          await livekit.createRealtimeLlm(livekit.resolveRealtimeVoiceConfig()),
          "the xai factory did not return a LiveKit realtime model",
        );
        await model.close();
        assert(
          process.env.GEMINI_API_KEY === GEMINI_KEY_CANARY &&
            process.env.GOOGLE_API_KEY === GOOGLE_KEY_CANARY &&
            process.env.GOOGLE_AI_API_KEY === GOOGLE_AI_KEY_CANARY,
          "a Gemini API key variable was touched",
        );
        assert(
          process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined,
          "a Vertex ADC file was materialised for the xai backend",
        );
      },
    );
  });
}

// ---------------------------------------------------------------------------
// The real xAI plugin against a stub WebSocket server
// ---------------------------------------------------------------------------

type StubUpgrade = { url: string; authorization: string | undefined };
type StubSend = (event: Json) => void;
type StubServer = {
  url: string;
  upgrades: StubUpgrade[];
  events: Json[];
  closedSockets: () => number;
  send: StubSend;
  close: () => Promise<void>;
};

function parseEvent(data: unknown): Json {
  const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error("the plugin sent a frame that is not a JSON object");
  }
  return parsed;
}

async function startStub(
  onEvent: (event: Json, send: StubSend) => void = () => undefined,
): Promise<StubServer> {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the stub server has no port");
  }
  const upgrades: StubUpgrade[] = [];
  const events: Json[] = [];
  let closed = 0;
  let current: WebSocket | undefined;
  const send: StubSend = (event) => {
    current?.send(JSON.stringify(event));
  };
  server.on("connection", (socket, request) => {
    current = socket;
    upgrades.push({
      url: request.url ?? "",
      authorization: request.headers.authorization,
    });
    socket.on("message", (data) => {
      const event = parseEvent(data);
      events.push(event);
      onEvent(event, send);
    });
    socket.on("close", () => {
      closed += 1;
    });
  });
  return {
    url: `ws://127.0.0.1:${address.port}/v1`,
    upgrades,
    events,
    closedSockets: () => closed,
    send,
    close: async () => {
      for (const client of server.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

type XaiSessionContext = {
  stub: StubServer;
  model: llm.RealtimeModel;
  session: llm.RealtimeSession;
  errors: unknown[];
};

/** Create the xai model through the shipped factory, point it at a stub, open one session and always close both. */
async function withXaiSession<T>(
  extraEnv: Readonly<Record<string, string | undefined>>,
  onEvent: (event: Json, send: StubSend) => void,
  body: (context: XaiSessionContext) => Promise<T>,
): Promise<T> {
  const stub = await startStub(onEvent);
  try {
    return await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: STUB_BEARER,
        XAI_REALTIME_BASE_URL: stub.url,
        ...extraEnv,
      },
      async () => {
        const model = liveKitModel(
          await livekit.createRealtimeLlm(livekit.resolveRealtimeVoiceConfig()),
          "the xai factory did not return a LiveKit realtime model",
        );
        const session = model.session();
        const errors: unknown[] = [];
        session.on("error", (error: unknown) => {
          errors.push(error);
        });
        try {
          return await body({ stub, model, session, errors });
        } finally {
          await session.close();
          await model.close();
        }
      },
    );
  } finally {
    await stub.close();
  }
}

type McpStub = { url: string; close: () => Promise<void> };

/** A loopback MCP server that lists the given tools and answers nothing else, one stateless exchange per request. */
async function startMcpStub(
  tools: ReadonlyArray<{
    name: string;
    description: string;
    inputSchema: Json;
  }>,
): Promise<McpStub> {
  const http = createServer((request, response) => {
    void (async () => {
      const server = new Server(
        { name: "realtime-voice-stub", version: "1.0.0" },
        { capabilities: { tools: {} } },
      );
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: { type: "object" as const, ...tool.inputSchema },
        })),
      }));
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      response.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(request, response);
    })().catch(() => {
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(0, "127.0.0.1", resolve);
  });
  const address = http.address();
  if (address === null || typeof address === "string") {
    throw new Error("the MCP stub has no port");
  }
  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        http.closeAllConnections();
        http.close(() => resolve());
      }),
  };
}

const answerSessionUpdate = (
  session: Json = {},
): ((event: Json, send: StubSend) => void) => {
  let created = false;
  return (event, send) => {
    if (event.type === "session.update" && !created) {
      created = true;
      send({ type: "session.created", event_id: "evt_stub_1", session });
    }
  };
};

async function drain(stream: unknown): Promise<unknown[]> {
  if (!(stream instanceof ReadableStream)) {
    throw new Error("expected a readable stream");
  }
  const reader = stream.getReader();
  const items: unknown[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return items;
    }
    items.push(value);
  }
}

async function xaiStubSection(): Promise<void> {
  await test("xai plugin against a stub: the upgrade carries the model on the query and the key as a Bearer header, and the first event is the session.update the plugin builds", async () => {
    await withXaiSession(
      { VOICE_S2S_VOICE: "eve" },
      answerSessionUpdate(),
      async ({ stub, errors }) => {
        await waitFor(() => stub.events.length > 0, "the first client event");
        assert(
          stub.upgrades.length === 1,
          "the plugin opened more or fewer than one connection",
        );
        const [upgrade] = stub.upgrades;
        assert(
          upgrade.url === `/v1/realtime?model=${XAI_DEFAULT_MODEL}`,
          "the upgrade path or query is not the one the plugin builds",
        );
        assert(
          upgrade.authorization === `Bearer ${STUB_BEARER}`,
          "the upgrade does not carry the key as a Bearer header",
        );
        assert(
          !upgrade.url.includes(STUB_BEARER),
          "the key was put in the URL",
        );
        const first = stub.events[0];
        assert(
          first.type === "session.update",
          "the first client event is not a session.update",
        );
        const session = field(first, "session");
        assertSame(field(session, "type"), "realtime", "session type");
        assertSame(field(session, "model"), XAI_DEFAULT_MODEL, "session model");
        assertSame(
          field(session, "output_modalities"),
          ["audio"],
          "output modalities",
        );
        assertSame(
          field(session, "audio", "output", "voice"),
          "eve",
          "session voice",
        );
        assertSame(
          field(session, "audio", "input", "format"),
          { type: "audio/pcm", rate: 24_000 },
          "input audio format",
        );
        assertSame(
          field(session, "audio", "output", "format"),
          { type: "audio/pcm", rate: 24_000 },
          "output audio format",
        );
        assertSame(
          field(session, "audio", "input", "turn_detection"),
          {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200,
            create_response: true,
            interrupt_response: true,
          },
          "turn detection",
        );
        // With the plugin's default (`gpt-4o-mini-transcribe`, an OpenAI model
        // name) xAI answered one spoken utterance with five "completed"
        // transcripts. Without the key it sent one, so the factory leaves the
        // key out of the layout altogether.
        const input = field(session, "audio", "input");
        assert(
          isRecord(input) && !("transcription" in input),
          "the session.update carries an audio.input.transcription key",
        );
        assert(
          errors.length === 0,
          "the session reported an error during the handshake",
        );
      },
    );
  });

  await test("xai plugin against a stub: with no voice configured the plugin's own voice is sent", async () => {
    await withXaiSession({}, answerSessionUpdate(), async ({ stub }) => {
      await waitFor(() => stub.events.length > 0, "the first client event");
      assertSame(
        field(stub.events[0], "session", "audio", "output", "voice"),
        "ara",
        "default voice",
      );
    });
  });

  await test("xai plugin against a stub: the model option reaches the query unchanged for a documented id and an alias", async () => {
    for (const id of ["grok-voice-latest", "grok-voice-2.0"]) {
      await withXaiSession(
        { VOICE_LIVE_MODEL: id },
        answerSessionUpdate(),
        async ({ stub }) => {
          await waitFor(() => stub.upgrades.length > 0, "the upgrade");
          assert(
            stub.upgrades[0].url === `/v1/realtime?model=${id}`,
            "the model id was altered on its way to the query",
          );
        },
      );
    }
  });

  await test("xai factory with the real plugin: with no key it refuses before any model exists, whatever OPENAI_API_KEY holds", async () => {
    // Nothing dials from a constructor, so no stub can observe this case: the
    // plugin opens its socket only in `model.session()`. What is pinned is that
    // the factory throws instead of returning a model that would pick up the
    // ambient OpenAI key. Without the guard the factory returns a model and
    // `rejection` fails with "returned normally".
    const message = await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_REALTIME_BASE_URL: "ws://127.0.0.1:9/v1",
        OPENAI_API_KEY: AMBIENT_OPENAI_CANARY,
      },
      () =>
        rejection(() =>
          livekit.createRealtimeLlm(livekit.resolveRealtimeVoiceConfig()),
        ),
    );
    assert(
      message.includes("XAI_API_KEY"),
      "the error does not name XAI_API_KEY",
    );
    assert(
      !message.includes(AMBIENT_OPENAI_CANARY),
      "the error repeats the ambient key",
    );
  });

  await test("xai model: with no base URL configured the plugin keeps its own endpoint, whatever OPENAI_BASE_URL says", async () => {
    await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: STUB_BEARER,
        OPENAI_BASE_URL: AMBIENT_OPENAI_URL,
      },
      async () => {
        const model = liveKitModel(
          await livekit.createRealtimeLlm(livekit.resolveRealtimeVoiceConfig()),
          "the xai factory did not return a LiveKit realtime model",
        );
        assert(
          model.label() === "xai.RealtimeModel",
          "the xai factory did not return the xai model",
        );
        assert(
          model.provider === new URL(XAI_PLUGIN_DEFAULT_URL).host,
          "the model does not target the plugin's own xai host",
        );
        assert(
          model.model === XAI_DEFAULT_MODEL,
          "the model id is not the configured one",
        );
        await model.close();
      },
    );
  });

  await test("xai factory with a hand-built config: a ws:// base URL to a host other than loopback is refused unless XAI_REALTIME_ALLOW_INSECURE is true, and loopback ws:// and wss:// build the model", async () => {
    // A config made by hand never goes through resolveRealtimeVoiceConfig, so
    // the factory has to apply the rule itself. Nothing dials from a
    // constructor, so a refused URL is told apart from an accepted one by
    // whether a model comes back.
    const before = process.env.XAI_REALTIME_ALLOW_INSECURE;
    const base = await resolveConfig({ VOICE_REALTIME_BACKEND: "xai" });
    const build = (url: string) =>
      livekit.createRealtimeLlm({ ...base, xaiBaseURL: url });
    const hostOf = (model: llm.RealtimeModel): string => model.provider;
    const crossHost = [
      "ws://gateway.example.test/v1",
      "ws://10.0.0.5:9/v1",
      "ws://[2001:db8::1]:9/v1",
      "ws://127.0.0.1.example.test/v1",
      "ws://127.0.0.1@gateway.example.test/v1",
      "ws://128.0.0.1/v1",
    ];
    const accepted = [
      "ws://localhost:9/v1",
      "ws://127.0.0.1:9/v1",
      "ws://[::1]:9/v1",
      "wss://gateway.example.test/v1",
      "wss://10.0.0.5:9/v1",
    ];

    for (const optIn of [undefined, "", "false", "1"]) {
      for (const url of crossHost) {
        const message = await withEnv(
          { XAI_API_KEY: STUB_BEARER, XAI_REALTIME_ALLOW_INSECURE: optIn },
          () => rejection(() => build(url)),
        );
        assert(
          message.includes("xaiBaseURL") &&
            message.includes("XAI_REALTIME_ALLOW_INSECURE"),
          "the error does not name xaiBaseURL and the opt-in variable",
        );
        assert(
          !message.includes(url) &&
            !message.includes(new URL(url).hostname) &&
            !message.includes(STUB_BEARER),
          "the error repeats the refused URL, its host or the key",
        );
      }
    }

    for (const url of crossHost) {
      await withEnv(
        { XAI_API_KEY: STUB_BEARER, XAI_REALTIME_ALLOW_INSECURE: "true" },
        async () => {
          const model = liveKitModel(
            await build(url),
            "the opt-in did not let the factory build a model for a ws:// URL",
          );
          assert(
            hostOf(model) === new URL(url).host,
            "the model does not target the opted-in host",
          );
          await model.close();
        },
      );
    }

    for (const url of accepted) {
      await withEnv({ XAI_API_KEY: STUB_BEARER }, async () => {
        const model = liveKitModel(
          await build(url),
          "the factory refused a loopback ws:// or a wss:// URL without the opt-in",
        );
        assert(
          hostOf(model) === new URL(url).host,
          "the model does not target the configured host",
        );
        await model.close();
      });
    }

    const noKey = await withEnv({}, () =>
      rejection(() => build("ws://gateway.example.test/v1")),
    );
    assert(
      noKey.includes("XAI_API_KEY"),
      "a missing key was not reported before the base URL",
    );

    assert(
      process.env.XAI_REALTIME_ALLOW_INSECURE === before,
      "XAI_REALTIME_ALLOW_INSECURE was not restored",
    );
  });

  await test("xai factory with a hand-built config: a base URL that is not a ws:// or wss:// URL is refused, with or without XAI_REALTIME_ALLOW_INSECURE, and the error names xaiBaseURL without repeating the value", async () => {
    // The cross-host rule alone lets an http(s) or unparseable value through to
    // the plugin, which is handed XAI_API_KEY as well. The opt-in only ever
    // covers a ws:// URL, so it must not admit any of these.
    const before = process.env.XAI_REALTIME_ALLOW_INSECURE;
    const base = await resolveConfig({ VOICE_REALTIME_BACKEND: "xai" });
    const build = (url: string) =>
      livekit.createRealtimeLlm({ ...base, xaiBaseURL: url });
    const marker = "canary-base-url-value";
    const notWebSocket = [
      `https://gateway.example.test/v1/${marker}`,
      `http://gateway.example.test/v1/${marker}`,
      `http://127.0.0.1:9/v1/${marker}`,
      `ftp://gateway.example.test/v1/${marker}`,
      `gateway.example.test/v1/${marker}`,
      `not a url ${marker}`,
    ];

    for (const optIn of [undefined, "true"]) {
      for (const url of notWebSocket) {
        const message = await withEnv(
          { XAI_API_KEY: STUB_BEARER, XAI_REALTIME_ALLOW_INSECURE: optIn },
          () => rejection(() => build(url)),
        );
        assert(
          message.includes("xaiBaseURL"),
          "the error does not name xaiBaseURL",
        );
        assert(
          !message.includes(marker) &&
            !message.includes("gateway.example.test") &&
            !message.includes(STUB_BEARER),
          "the error repeats the refused value, its host or the key",
        );
        assert(
          !message.includes("XAI_REALTIME_ALLOW_INSECURE"),
          "the error offers the opt-in for a value it cannot admit",
        );
      }
    }

    const noKey = await withEnv({}, () =>
      rejection(() => build(notWebSocket[0])),
    );
    assert(
      noKey.includes("XAI_API_KEY") && !noKey.includes("xaiBaseURL"),
      "a missing key was not reported before the base URL",
    );

    assert(
      process.env.XAI_REALTIME_ALLOW_INSECURE === before,
      "XAI_REALTIME_ALLOW_INSECURE was not restored",
    );
  });

  await test("xai plugin against a stub: an MCP tool goes through buildRealtimeMcpTools, so its union and untyped schema reach the wire sanitized", async () => {
    const mcp = await startMcpStub([
      {
        name: "lookup",
        description: "Look up an account",
        inputSchema: {
          properties: {
            account: {
              anyOf: [{ type: "string" }, { type: "null" }],
              description: "Account id",
            },
            limit: { type: ["integer", "null"] },
            filters: {},
          },
          required: ["account", "missing"],
        },
      },
    ]);
    try {
      await withXaiSession(
        {},
        answerSessionUpdate(),
        async ({ stub, session }) => {
          await waitFor(() => stub.events.length > 0, "the first client event");
          const toolset = await livekit.buildRealtimeMcpTools({
            mcpUrl: mcp.url,
            authToken: "stub-auth",
            xContext: "stub-context",
            publishEvent: () => undefined,
            requestConfirmation: async () => true,
          });
          try {
            assertSame(
              Object.keys(toolset.tools),
              ["lookup"],
              "tools the bridge registered",
            );
            await session.updateTools(toolset.tools);
            await waitFor(
              () =>
                stub.events.some(
                  (event) => field(event, "session", "tools") !== undefined,
                ),
              "the tools update",
            );
            const update = stub.events.find(
              (event) => field(event, "session", "tools") !== undefined,
            );
            const wire = field(update, "session", "tools");
            assertSame(
              wire,
              [
                {
                  name: "lookup",
                  description: "Look up an account",
                  parameters: {
                    type: "object",
                    properties: {
                      account: { type: "string", description: "Account id" },
                      limit: { type: "integer" },
                      filters: { type: "string" },
                    },
                    required: ["account"],
                  },
                  type: "function",
                },
              ],
              "tools on the wire",
            );
            assert(
              !JSON.stringify(wire).includes("anyOf"),
              "a union reached the wire unsanitized",
            );
          } finally {
            await toolset.client.close();
          }
        },
      );
    } finally {
      await mcp.close();
    }
  });

  await test("xai plugin against a stub: OpenAI-style transcript and usage events become the user transcript, the assistant text stream and the usage numbers the agent reads", async () => {
    await withXaiSession(
      {},
      answerSessionUpdate(),
      async ({ stub, session }) => {
        await waitFor(() => stub.events.length > 0, "the first client event");
        const userTranscripts: Json[] = [];
        const metrics: Json[] = [];
        const replies: Promise<unknown[]>[] = [];
        session.on("input_audio_transcription_completed", (event: unknown) => {
          if (isRecord(event)) {
            userTranscripts.push(event);
          }
        });
        session.on("metrics_collected", (event: unknown) => {
          if (isRecord(event)) {
            metrics.push(event);
          }
        });
        session.on("generation_created", (event: unknown) => {
          replies.push(
            (async () => {
              const chunks: unknown[] = [];
              for (const message of await drain(
                field(event, "messageStream"),
              )) {
                chunks.push(...(await drain(field(message, "textStream"))));
              }
              return chunks;
            })(),
          );
        });
        stub.send({
          type: "conversation.item.input_audio_transcription.completed",
          item_id: "user_1",
          content_index: 0,
          transcript: "what is on my calendar",
        });
        stub.send({ type: "response.created", response: { id: "resp_1" } });
        stub.send({
          type: "response.output_item.added",
          item: { id: "item_1", type: "message", role: "assistant" },
        });
        stub.send({
          type: "response.content_part.added",
          item_id: "item_1",
          part: { type: "audio" },
        });
        for (const delta of ["Your calendar ", "is clear."]) {
          stub.send({
            type: "response.output_audio_transcript.delta",
            item_id: "item_1",
            delta,
          });
        }
        stub.send({
          type: "response.output_item.done",
          item: { id: "item_1", type: "message" },
        });
        stub.send({
          type: "response.done",
          response: {
            id: "resp_1",
            status: "completed",
            usage: {
              input_tokens: 10,
              output_tokens: 4,
              total_tokens: 14,
              input_token_details: { audio_tokens: 6, text_tokens: 4 },
              output_token_details: { audio_tokens: 3, text_tokens: 1 },
            },
          },
        });
        await waitFor(
          () =>
            userTranscripts.length > 0 &&
            metrics.length > 0 &&
            replies.length > 0,
          "the transcript, the metrics and the reply",
        );
        assertSame(
          userTranscripts[0],
          {
            itemId: "user_1",
            transcript: "what is on my calendar",
            isFinal: true,
          },
          "user transcript",
        );
        const chunks = await replies[0];
        assert(
          chunks.map((chunk) => String(chunk)).join("") ===
            "Your calendar is clear.",
          "the assistant transcript did not arrive as the text stream",
        );
        assert(
          metrics[0].type === "realtime_model_metrics",
          "the usage event is not a realtime_model_metrics record",
        );
        assertSame(field(metrics[0], "inputTokens"), 10, "input tokens");
        assertSame(
          field(metrics[0], "inputTokenDetails", "audioTokens"),
          6,
          "input audio tokens",
        );
        assertSame(field(metrics[0], "outputTokens"), 4, "output tokens");
        assertSame(
          field(metrics[0], "outputTokenDetails", "audioTokens"),
          3,
          "output audio tokens",
        );
      },
    );
  });

  // xAI puts the usage of a response at the top level of response.done and
  // leaves response.usage an empty object (recorded live, 2026-10-20), so the
  // plugin's own metrics are all zero on this backend.
  await test("xai plugin against a stub: usage at the top level of response.done is logged as realtime.usage in the shape the Gemini backend logs, and a report without token counts logs nothing", async () => {
    const consoleLines = collectConsole();
    try {
      await withXaiSession(
        { NEUROLINK_DEBUG: "true" },
        answerSessionUpdate(),
        async ({ stub, session }) => {
          await waitFor(() => stub.events.length > 0, "the first client event");
          const done: string[] = [];
          session.on("openai_server_event_received", (event: unknown) => {
            if (field(event, "type") === "response.done") {
              done.push(String(field(event, "response", "id")));
            }
          });
          stub.send({
            type: "response.done",
            response: { id: "resp_top", status: "completed", usage: {} },
            usage: {
              input_tokens: 220,
              input_token_details: {
                text_tokens: 16,
                audio_tokens: 204,
                grok_tokens: 0,
              },
              output_tokens: 242,
              output_token_details: {
                text_tokens: 18,
                audio_tokens: 224,
                grok_tokens: 0,
              },
              total_tokens: 462,
              output_audio_seconds: 4.48,
              billable_audio_seconds: 9,
            },
          });
          stub.send({
            type: "response.done",
            response: {
              id: "resp_nested",
              status: "completed",
              usage: {
                input_tokens: 10,
                output_tokens: 4,
                input_token_details: { audio_tokens: 6, text_tokens: 4 },
                output_token_details: { audio_tokens: 3, text_tokens: 1 },
              },
            },
          });
          stub.send({
            type: "response.done",
            response: { id: "resp_empty", status: "cancelled", usage: {} },
            usage: {},
          });
          // Seconds are reported for a response that had no tokens to count;
          // that is not a usage record, and logging it would read as zeros.
          stub.send({
            type: "response.done",
            response: { id: "resp_seconds", status: "cancelled", usage: {} },
            usage: { output_audio_seconds: 1.5, billable_audio_seconds: 2 },
          });
          await waitFor(() => done.length === 4, "the four response.done");
        },
      );
    } finally {
      consoleLines.stop();
    }
    const logged = logDataAll(consoleLines.lines, "realtime.usage");
    assert(
      logged.length === 2,
      "the usage of the two responses that carried some was not logged exactly once each",
    );
    assertSame(
      logged[0],
      {
        inputTokens: 220,
        inputAudioTokens: 204,
        inputTextTokens: 16,
        outputTokens: 242,
        outputAudioTokens: 224,
        outputTextTokens: 18,
      },
      "usage read from the top level",
    );
    assertSame(
      logged[1],
      {
        inputTokens: 10,
        inputAudioTokens: 6,
        inputTextTokens: 4,
        outputTokens: 4,
        outputAudioTokens: 3,
        outputTextTokens: 1,
      },
      "usage read from response.usage when the top level has none",
    );
  });

  // The service accepts any model id and runs a default for one it does not
  // know (a made-up id, and the aliases `grok-voice-latest` and the plugin's own
  // `grok-voice-think-fast-1.0`, all came back as `grok-voice-3.0`).
  await test("xai plugin against a stub: a session.created that names another model than the one asked for is warned about, and an equal or absent model is not", async () => {
    const run = async (
      requested: string | undefined,
      created: Json,
    ): Promise<string[]> => {
      const consoleLines = collectConsole();
      try {
        await withXaiSession(
          {
            NEUROLINK_DEBUG: "true",
            ...(requested === undefined ? {} : { VOICE_LIVE_MODEL: requested }),
          },
          answerSessionUpdate(created),
          async ({ stub }) => {
            await waitFor(
              () => stub.events.length > 0,
              "the first client event",
            );
            // Frames arrive in order, so once the usage of this response is
            // logged the session.created before it has been read.
            stub.send({
              type: "response.done",
              response: { id: "fence", status: "completed", usage: {} },
              usage: { input_tokens: 1, output_tokens: 1 },
            });
            await waitFor(
              () =>
                consoleLines.lines.some((line) =>
                  line.includes("realtime.usage"),
                ),
              "the fence response",
            );
          },
        );
      } finally {
        consoleLines.stop();
      }
      return consoleLines.lines;
    };

    const mismatch = await run("grok-voice-nonexistent-9.9", {
      model: XAI_DEFAULT_MODEL,
    });
    const [warning] = logDataAll(mismatch, "realtime.xai.modelMismatch");
    assert(
      warning !== undefined,
      "no warning for a model other than the one asked for",
    );
    assertSame(
      [field(warning, "requested"), field(warning, "served")],
      ["grok-voice-nonexistent-9.9", XAI_DEFAULT_MODEL],
      "the warning names both models",
    );

    for (const [label, created] of [
      ["the model asked for", { model: XAI_DEFAULT_MODEL }],
      ["no model at all", {}],
    ] as const) {
      const lines = await run(undefined, created);
      assert(
        !lines.some((line) => line.includes("realtime.xai.modelMismatch")),
        `a warning was written for ${label}`,
      );
    }
  });

  await test("xai session: the refused-upgrade watch ends once the connection is made or the session is closed, and a matching crash after that is left alone", async () => {
    const monitors = (): number =>
      process.listenerCount("uncaughtExceptionMonitor");
    const baseline = monitors();
    const refusal = new Error("Unexpected server response: 400");

    let whileConnecting = -1;
    let afterConnect = -1;
    let errorsAfterCrash = -1;
    await withXaiSession(
      {},
      answerSessionUpdate(),
      async ({ stub, errors }) => {
        whileConnecting = monitors();
        await waitFor(() => stub.events.length > 0, "the first client event");
        // session.created follows the first client event, and the watch ends
        // when it is read.
        await waitFor(
          () => monitors() === baseline,
          "the watch to end once the connection was made",
        );
        afterConnect = monitors();
        // `process.emit` has no overload for this event, so go through the
        // emitter type; a crash is announced to monitors exactly this way.
        const emitter: NodeJS.EventEmitter = process;
        emitter.emit("uncaughtExceptionMonitor", refusal, "uncaughtException");
        errorsAfterCrash = errors.length;
      },
    );
    assertSame(
      [whileConnecting, afterConnect, monitors()],
      [baseline + 1, baseline, baseline],
      "watches while connecting, once connected and after the session closed",
    );
    assert(
      errorsAfterCrash === 0,
      "a crash after the connection was made was reported as a refused upgrade",
    );

    // A server that never answers keeps the watch on until the session closes.
    let whileWaiting = -1;
    await withXaiSession(
      {},
      () => undefined,
      async ({ stub }) => {
        await waitFor(() => stub.events.length > 0, "the first client event");
        whileWaiting = monitors();
      },
    );
    assertSame(
      [whileWaiting, monitors()],
      [baseline + 1, baseline],
      "watches while no answer came and after the session closed",
    );
  });
}

const refusedUpgradeSchema = z.object({
  errors: z.array(
    z.object({
      type: z.string(),
      recoverable: z.boolean(),
      label: z.string(),
      message: z.string().nullable(),
    }),
  ),
  errorsAfterUnrelatedCrash: z.number(),
  uncaught: z.array(z.string()),
  monitorsBefore: z.number(),
  monitorsWhileWaiting: z.number(),
  monitorsAfter: z.number(),
});

/** A WebSocket server that answers every upgrade with HTTP 400, the way xAI answers a wrong key. */
async function startRefusingStub(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server = new WebSocketServer({
    host: "127.0.0.1",
    port: 0,
    verifyClient: (_info, callback) => callback(false, 400, "Bad Request"),
  });
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the refusing stub has no port");
  }
  return {
    url: `ws://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function xaiRefusedUpgradeSection(): Promise<void> {
  // The plugin opens its socket with no 'error' listener, so a refused upgrade
  // is an uncaught exception, and a process without a handler for it exits. The
  // child absorbs that the way a worker's process guards do; what is under test
  // is what this package did with the crash before that.
  await test("xai plugin against a server that refuses the upgrade with HTTP 400: the session reports one classified, unrecoverable error that names the key and not its value, and an unrelated crash is not taken for it", async () => {
    const stub = await startRefusingStub();
    try {
      const { result, raw } = await runFixture(REFUSED_UPGRADE, {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: STUB_BEARER,
        XAI_REALTIME_BASE_URL: stub.url,
      });
      const outcome = refusedUpgradeSchema.parse(result);
      assert(
        outcome.uncaught.includes("Unexpected server response: 400"),
        "the plugin no longer leaves a refused upgrade as an uncaught exception, so this case no longer describes it",
      );
      assert(
        outcome.errorsAfterUnrelatedCrash === 0,
        "an unrelated crash was reported as a refused upgrade",
      );
      assert(
        outcome.errors.length === 1,
        "the session did not report exactly one error for the refused upgrade",
      );
      const [error] = outcome.errors;
      assertSame(
        [error.type, error.recoverable],
        ["realtime_model_error", false],
        "the shape of the reported error",
      );
      const message = error.message ?? "";
      assert(
        message.includes("HTTP 400") && message.includes("XAI_API_KEY"),
        "the error does not name the status and the key variable",
      );
      assert(
        !raw.includes(STUB_BEARER),
        "the xai key reached the child's output",
      );
      assertSame(
        [outcome.monitorsWhileWaiting, outcome.monitorsAfter],
        [outcome.monitorsBefore + 1, outcome.monitorsBefore],
        "the watch is on while the connection is made and off after the refusal",
      );
    } finally {
      await stub.close();
    }
  });
}

// ---------------------------------------------------------------------------
// The agent entry: which backend's helpers run, what is logged
// ---------------------------------------------------------------------------

type EntryContext = Parameters<
  ReturnType<typeof livekit.defineRealtimeVoiceAgent>["entry"]
>[0];

const STOP = "stop-after-the-step-under-test";

/** A job context that lets `entry` run up to a chosen step and then throws. `connects` counts connect() calls. */
function fakeContext(stopAfter: "connect" | "lifecycle"): {
  context: EntryContext;
  connects: () => number;
} {
  let connects = 0;
  const room = {
    name: "stub-room",
    metadata: "",
    remoteParticipants: new Map<string, unknown>(),
    on: (): never => {
      throw new Error(STOP);
    },
  };
  const context = {
    room,
    connect: async (): Promise<void> => {
      connects += 1;
      if (stopAfter === "connect") {
        throw new Error(STOP);
      }
    },
    addShutdownCallback: (): void => undefined,
  };
  return {
    // The stand-in covers only what `entry` touches before the stop.
    context: context as unknown as EntryContext,
    connects: () => connects,
  };
}

/** Collect what is written to the console until `stop`; `lines` fills while it runs, so a case can wait on it. */
function collectConsole(): { lines: string[]; stop: () => void } {
  const lines: string[] = [];
  const names = ["log", "info", "warn", "error", "debug"] as const;
  const originals = names.map((name) => console[name]);
  for (const name of names) {
    console[name] = (...args: unknown[]): void => {
      lines.push(
        args
          .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
          .join(" "),
      );
    };
  }
  return {
    lines,
    stop: () => {
      names.forEach((name, index) => {
        console[name] = originals[index];
      });
    },
  };
}

async function captureConsole<T>(
  body: () => Promise<T>,
): Promise<{ lines: string[]; error: unknown }> {
  const { lines, stop } = collectConsole();
  let error: unknown;
  try {
    await body();
  } catch (caught) {
    error = caught;
  } finally {
    stop();
  }
  return { lines, error };
}

function logData(lines: readonly string[], message: string): Json {
  const line = required(
    lines.find((entry) => entry.includes(message)),
    `no ${message} log line was written`,
  );
  const start = line.indexOf("{", line.indexOf(message));
  assert(start >= 0, `the ${message} log line carries no data`);
  const parsed: unknown = JSON.parse(line.slice(start));
  if (!isRecord(parsed)) {
    throw new Error(`the ${message} log data is not an object`);
  }
  return parsed;
}

/** The data of every log line that carries `message`, in the order written. */
function logDataAll(lines: readonly string[], message: string): Json[] {
  return lines
    .filter((entry) => entry.includes(message))
    .map((line) => {
      const start = line.indexOf("{", line.indexOf(message));
      assert(start >= 0, `the ${message} log line carries no data`);
      const parsed: unknown = JSON.parse(line.slice(start));
      if (!isRecord(parsed)) {
        throw new Error(`the ${message} log data is not an object`);
      }
      return parsed;
    });
}

const ADC_FIELDS = {
  GOOGLE_AUTH_CLIENT_EMAIL: "stub@example.invalid",
  GOOGLE_AUTH_PRIVATE_KEY: "not-key-material",
  GOOGLE_AUTH_BREEZE_PROJECT_ID: "stub-project",
};

const GEMINI_ENV_CANARIES = {
  GEMINI_API_KEY: GEMINI_KEY_CANARY,
  GOOGLE_API_KEY: GOOGLE_KEY_CANARY,
  GOOGLE_AI_API_KEY: GOOGLE_AI_KEY_CANARY,
};

async function agentSection(): Promise<void> {
  await test("agent entry: the gemini backend (the default) still materialises Vertex ADC and clears the Gemini API keys before it connects", async () => {
    let adcPath: string | undefined;
    try {
      await withEnv({ ...ADC_FIELDS, ...GEMINI_ENV_CANARIES }, async () => {
        const { context, connects } = fakeContext("connect");
        const agent = livekit.defineRealtimeVoiceAgent();
        const message = await rejection(() => agent.entry(context));
        assert(message === STOP, "entry failed before the connect step");
        assert(connects() === 1, "entry did not reach connect()");
        for (const name of Object.keys(GEMINI_ENV_CANARIES)) {
          assert(process.env[name] === undefined, `${name} was not cleared`);
        }
        adcPath = required(
          process.env.GOOGLE_APPLICATION_CREDENTIALS,
          "no Vertex ADC path was set",
        );
        assert(existsSync(adcPath), "no Vertex ADC file was written");
        const written: unknown = JSON.parse(readFileSync(adcPath, "utf8"));
        assertSame(
          field(written, "client_email"),
          ADC_FIELDS.GOOGLE_AUTH_CLIENT_EMAIL,
          "ADC client email",
        );
      });
    } finally {
      if (adcPath !== undefined) {
        rmSync(dirname(adcPath), { recursive: true, force: true });
      }
    }
  });

  await test("agent entry: the xai backend leaves the Gemini environment and Vertex ADC alone and does connect", async () => {
    await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        XAI_API_KEY: STUB_BEARER,
        ...ADC_FIELDS,
        ...GEMINI_ENV_CANARIES,
      },
      async () => {
        const { context, connects } = fakeContext("connect");
        const agent = livekit.defineRealtimeVoiceAgent();
        const message = await rejection(() => agent.entry(context));
        assert(message === STOP, "entry failed before the connect step");
        assert(connects() === 1, "entry did not reach connect()");
        assert(
          process.env.GEMINI_API_KEY === GEMINI_KEY_CANARY,
          "GEMINI_API_KEY was touched",
        );
        assert(
          process.env.GOOGLE_API_KEY === GOOGLE_KEY_CANARY,
          "GOOGLE_API_KEY was touched",
        );
        assert(
          process.env.GOOGLE_AI_API_KEY === GOOGLE_AI_KEY_CANARY,
          "GOOGLE_AI_API_KEY was touched",
        );
        assert(
          process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined,
          "a Vertex ADC file was materialised for the xai backend",
        );
      },
    );
  });

  await test("agent entry: a backend given in code beats the environment, so the xai backend can be chosen without an environment variable", async () => {
    await withEnv(
      { XAI_API_KEY: STUB_BEARER, ...ADC_FIELDS, ...GEMINI_ENV_CANARIES },
      async () => {
        const { context, connects } = fakeContext("connect");
        const agent = livekit.defineRealtimeVoiceAgent({ backend: "xai" });
        const message = await rejection(() => agent.entry(context));
        assert(
          message === STOP && connects() === 1,
          "entry did not reach connect()",
        );
        assert(
          process.env.GEMINI_API_KEY === GEMINI_KEY_CANARY,
          "GEMINI_API_KEY was touched",
        );
        assert(
          process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined,
          "a Vertex ADC file was materialised",
        );
      },
    );
  });

  await test("agent entry: the xai backend without XAI_API_KEY fails before it connects, naming the variable and repeating no value", async () => {
    await withEnv(
      {
        VOICE_REALTIME_BACKEND: "xai",
        OPENAI_API_KEY: AMBIENT_OPENAI_CANARY,
        ...GEMINI_ENV_CANARIES,
      },
      async () => {
        const { context, connects } = fakeContext("connect");
        const agent = livekit.defineRealtimeVoiceAgent();
        const message = await rejection(() => agent.entry(context));
        assert(
          message.includes("XAI_API_KEY"),
          "the error does not name XAI_API_KEY",
        );
        assert(connects() === 0, "entry connected before checking the key");
        for (const secret of [
          AMBIENT_OPENAI_CANARY,
          GEMINI_KEY_CANARY,
          GOOGLE_KEY_CANARY,
        ]) {
          assert(
            !message.includes(secret),
            "the error carries a value from the environment",
          );
        }
        assert(
          process.env.GEMINI_API_KEY === GEMINI_KEY_CANARY,
          "GEMINI_API_KEY was touched",
        );
      },
    );
  });

  await test("agent entry: the config built from code overrides over the environment is the one handed to the xai model factory", async () => {
    const { outcome, raw } = await record({
      XAI_API_KEY: STUB_BEARER,
      VOICE_REALTIME_BACKEND: "gemini",
      VOICE_LIVE_MODEL: "model-from-the-environment",
      VOICE_S2S_VOICE: "voice-from-the-environment",
      XAI_REALTIME_BASE_URL: "ws://127.0.0.1:9/from-the-environment",
      REALTIME_RECORDER_AGENT: JSON.stringify({
        backend: "xai",
        model: "grok-voice-latest",
        voice: "eve",
        xaiBaseURL: "wss://gateway.example/v1",
      }),
    });
    assert(
      outcome.ok,
      "the agent entry did not reach the model factory and the event bridge",
    );
    assert(
      outcome.recorded.length === 1,
      "the agent entry did not build exactly one model",
    );
    const [call] = outcome.recorded;
    assert(
      call.plugin === "xai",
      "the agent entry did not build the xai model",
    );
    assertSame(
      call.options,
      {
        model: "grok-voice-latest",
        voice: "eve",
        baseURL: "wss://gateway.example/v1",
      },
      "options the entry gave the xai model",
    );
    assertSame(
      outcome.memoryCalls,
      [{ call: { model: "grok-voice-latest", backend: "xai" } }],
      "what the entry told the call memory setup",
    );
    assert(!raw.includes(STUB_BEARER), "the xai key reached the child output");
  });

  await test("agent entry: the config built from code overrides over the environment is the one handed to the gemini model factory", async () => {
    const { outcome } = await record({
      VERTEX_PROJECT: "project-from-the-environment",
      VERTEX_LOCATION: "location-from-the-environment",
      VOICE_LIVE_MODEL: "model-from-the-environment",
      VOICE_S2S_VOICE: "voice-from-the-environment",
      REALTIME_RECORDER_AGENT: JSON.stringify({
        project: "project-z",
        location: "europe-west4",
        model: "gemini-live-override",
        voice: "Puck",
        responseModality: "TEXT",
      }),
    });
    assert(
      outcome.ok,
      "the agent entry did not reach the model factory and the event bridge",
    );
    assert(
      outcome.recorded.length === 1,
      "the agent entry did not build exactly one model",
    );
    const [call] = outcome.recorded;
    assert(
      call.plugin === "google",
      "the agent entry did not build the google model",
    );
    assertSame(
      call.options,
      {
        vertexai: true,
        model: "gemini-live-override",
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        modalities: ["TEXT"],
        project: "project-z",
        location: "europe-west4",
        voice: "Puck",
      },
      "options the entry gave the gemini model",
    );
    assertSame(
      outcome.memoryCalls,
      [{ call: { model: "gemini-live-override", backend: "gemini" } }],
      "what the entry told the call memory setup",
    );
  });

  await test("agent entry: the config and room-joined logs name the backend, carry the Vertex project and location for gemini only, and never carry the xai key", async () => {
    const run = async (
      vars: Readonly<Record<string, string | undefined>>,
    ): Promise<{ config: Json; joined: Json; text: string }> =>
      withEnv({ NEUROLINK_DEBUG: "true", ...vars }, async () => {
        const { context } = fakeContext("lifecycle");
        const agent = livekit.defineRealtimeVoiceAgent();
        const captured = await captureConsole(() => agent.entry(context));
        assert(
          messageOf(captured.error) === STOP,
          "entry failed before the step under test",
        );
        return {
          config: logData(captured.lines, "realtime.config"),
          joined: logData(captured.lines, "realtime.room.joined"),
          text: captured.lines.join("\n"),
        };
      });

    const gemini = await run({
      VERTEX_PROJECT: "project-a",
      VERTEX_LOCATION: "us-central1",
      VOICE_S2S_VOICE: "Kore",
    });
    assert(
      gemini.config.backend === "gemini",
      "the gemini config log does not name the backend",
    );
    assert(
      gemini.config.project === "project-a",
      "the gemini config log lost the project",
    );
    assert(
      gemini.config.location === "us-central1",
      "the gemini config log lost the location",
    );
    assert(
      gemini.config.modality === "AUDIO",
      "the gemini config log lost the modality",
    );
    assert(
      gemini.config.model === GEMINI_DEFAULT_MODEL,
      "the gemini config log lost the model",
    );
    assert(
      gemini.joined.backend === "gemini",
      "the gemini joined log does not name the backend",
    );
    assert(
      gemini.joined.location === "us-central1",
      "the gemini joined log lost the location",
    );

    const xai = await run({
      VOICE_REALTIME_BACKEND: "xai",
      XAI_API_KEY: STUB_BEARER,
      XAI_REALTIME_BASE_URL: "ws://127.0.0.1:9/v1",
      VERTEX_PROJECT: "project-a",
      VERTEX_LOCATION: "us-central1",
      VOICE_S2S_VOICE: "eve",
    });
    assert(
      xai.config.backend === "xai",
      "the xai config log does not name the backend",
    );
    assert(
      xai.config.model === XAI_DEFAULT_MODEL,
      "the xai config log lost the model",
    );
    assert(xai.config.voice === "eve", "the xai config log lost the voice");
    assert(
      xai.joined.backend === "xai",
      "the xai joined log does not name the backend",
    );
    for (const [label, data] of [
      ["config", xai.config],
      ["joined", xai.joined],
    ] as const) {
      for (const key of ["project", "location", "modality"]) {
        assert(
          !(key in data),
          `the xai ${label} log carries the Gemini-only field ${key}`,
        );
      }
    }
    assert(
      !xai.text.includes("project-a"),
      "the xai logs carry the Vertex project",
    );
    assert(
      !xai.text.includes("us-central1"),
      "the xai logs carry the Vertex location",
    );
    assert(!xai.text.includes(STUB_BEARER), "the xai logs carry the xai key");
    assert(
      !xai.text.includes("127.0.0.1:9"),
      "the xai logs carry the base URL",
    );
  });
}

initializeLogger({ pretty: false, level: "silent" });

await configSection();
await geminiFactorySection();
await xaiFactorySection();
await xaiStubSection();
await xaiRefusedUpgradeSection();
await agentSection();

await runSuite();
