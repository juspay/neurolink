#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";
import "./helpers/emptyWorkingDirectory.js";

/**
 * Continuous Test Suite — the tool schema NeuroLink puts on the wire for a zod
 * `inputSchema`, pinned for 49 schema shapes.
 *
 * WHY. zod decides what JSON Schema a model sees, and a zod release can change
 * it without touching a line here. Between 4.3.6 and 4.6.7 a nullable field went
 * from `anyOf: [{type: "string"}, {type: "null"}]` to `type: ["string", "null"]`,
 * an intersection of objects was merged into one object, and tuples gained
 * length limits. The repository's lockfile pinned 4.3.6 while an install of the
 * published package already resolved 4.6.7, and every other suite passed on both,
 * so nothing said so. This suite is that signal: when a lockfile change moves a
 * schema, it names the shape and fails.
 *
 * WHAT. Each shape is wrapped in an object and handed to `generate()` as a tool's
 * `inputSchema`; the schema is then read back from the request body the provider
 * actually sent to a loopback stand-in. Key order counts: the serialised tool
 * definitions are part of a cached prompt prefix, so a reordering is a change
 * callers can see. Two routes, because they ask zod for two dialects:
 *
 *  - `openai-compatible`: `provider: "openai"`, draft-07, read from
 *    `tools[].function.parameters`.
 *  - `gemini-native`: `provider: "google-ai"` (the native @google/genai path),
 *    the `openApi3` dialect that every Gemini call site asks for, read from the
 *    `probe` function declaration in `tools[].functionDeclarations`.
 *
 * The Vertex client has its own call sites for the same dialect; they are not
 * driven here, since Vertex needs Google credentials a loopback cannot stand in
 * for. Both ask the same converter for the same dialect, so a change in zod
 * reaches both, though Vertex post-processes the result in its own way.
 *
 * UPDATING. After reading what changed, rewrite the pin with
 * `UPDATE_ZOD_WIRE_FIXTURE=1 pnpm run test:zod-wire-schemas`, format it with
 * `pnpm exec prettier --write test/fixtures/zod-wire-schemas.json` (the comparison
 * ignores whitespace), and review the diff of the fixture as a statement about what
 * callers will now send.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { NeuroLink, tool } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { startMockChatServer } from "./helpers/mockChatServer.js";

assertDistFresh();

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "zod-wire-schemas.json",
);
const updating = process.env.UPDATE_ZOD_WIRE_FIXTURE === "1";

const { test, runSuite } = defineSuite("zod tool schemas on the wire", {
  offline: true,
});

const Node: z.ZodType = z.object({
  name: z.string(),
  children: z.array(z.lazy(() => Node)).optional(),
});
const Recursive: z.ZodType = z.object({
  id: z.number(),
  get next() {
    return Recursive.optional();
  },
});

const SHAPES: Record<string, z.ZodType> = {
  string_basic: z.string(),
  string_constraints: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-z]+$/),
  string_formats: z.object({
    e: z.email(),
    u: z.url(),
    id: z.uuid(),
    dt: z.iso.datetime(),
    ip: z.ipv4(),
  }),
  number_constraints: z.number().int().min(0).max(100),
  number_positive_multiple: z.number().positive().multipleOf(5),
  bigint_val: z.bigint(),
  boolean_val: z.boolean(),
  literal_val: z.literal("a"),
  literal_union: z.union([z.literal("a"), z.literal(2), z.literal(true)]),
  enum_val: z.enum(["red", "green", "blue"]),
  native_enum: z.nativeEnum({ A: "a", B: "b" }),
  object_basic: z.object({
    a: z.string(),
    b: z.number().optional(),
    c: z.boolean().nullable(),
  }),
  object_defaults: z.object({
    a: z.string().default("x"),
    b: z.number().default(3),
    c: z.array(z.string()).default([]),
  }),
  object_strict: z.strictObject({ a: z.string() }),
  object_loose: z.looseObject({ a: z.string() }),
  object_catchall: z.object({ a: z.string() }).catchall(z.number()),
  object_describe: z
    .object({
      q: z.string().describe("the query"),
      n: z.number().describe("how many").optional(),
    })
    .describe("search args"),
  object_nested: z.object({
    user: z.object({
      tags: z.array(
        z.object({ k: z.string(), v: z.union([z.string(), z.number()]) }),
      ),
    }),
  }),
  array_constraints: z.array(z.string()).min(1).max(5),
  array_nonempty: z.array(z.number()).nonempty(),
  tuple_val: z.tuple([z.string(), z.number()]),
  tuple_rest: z.tuple([z.string()], z.number()),
  record_string: z.record(z.string(), z.number()),
  record_enum: z.record(z.enum(["a", "b"]), z.boolean()),
  union_val: z.union([z.string(), z.number(), z.null()]),
  discriminated: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("a"), x: z.string() }),
    z.object({ kind: z.literal("b"), y: z.number() }),
  ]),
  intersection_val: z.intersection(
    z.object({ a: z.string() }),
    z.object({ b: z.number() }),
  ),
  nullable_val: z.string().nullable(),
  nullish_val: z.object({ a: z.string().nullish() }),
  optional_default: z.object({ a: z.string().optional().default("z") }),
  readonly_val: z.object({ a: z.string() }).readonly(),
  catch_val: z.string().catch("fallback"),
  coerce_number: z.coerce.number(),
  date_val: z.date(),
  refine_val: z
    .object({ a: z.number() })
    .refine((v) => v.a > 0, { message: "a must be positive" }),
  transform_val: z.string().transform((s) => s.length),
  pipe_val: z.string().pipe(z.string().min(2)),
  preprocess_val: z.preprocess((v) => String(v), z.string()),
  template_literal: z.templateLiteral(["id-", z.number()]),
  set_val: z.set(z.string()),
  map_val: z.map(z.string(), z.number()),
  any_val: z.any(),
  unknown_val: z.unknown(),
  void_val: z.void(),
  never_val: z.never(),
  lazy_recursive: Node,
  getter_recursive: Recursive,
  meta_val: z.string().meta({ title: "T", examples: ["e"] }),
  tool_like: z.object({
    path: z.string().describe("file path"),
    mode: z.enum(["r", "w"]).default("r"),
    opts: z.object({ recursive: z.boolean().optional() }).optional(),
  }),
};

type OpenAiWireTool = { function?: { name?: string; parameters?: unknown } };
type GeminiWireDeclaration = {
  name?: string;
  description?: string;
  [field: string]: unknown;
};
type GeminiWireTool = { functionDeclarations?: GeminiWireDeclaration[] };

const NOT_SENT = (threw: boolean) => ({
  NOT_SENT: threw ? "generate threw" : "no probe tool in request",
});

function probeTool(schema: z.ZodType) {
  return {
    probe: tool({
      description: "probe",
      inputSchema: z.object({ value: schema }),
      execute: async () => "ok",
    }),
  };
}

async function captureOpenAiCompatible(): Promise<Record<string, string>> {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const seen: Record<string, string> = {};
  try {
    for (const [name, schema] of Object.entries(SHAPES)) {
      const before = server.getAllRequestBodies().length;
      let threw = false;
      try {
        await sdk.generate({
          input: { text: "hi" },
          provider: "openai",
          model: "gpt-4o-mini",
          maxSteps: 1,
          disableInternalFallback: true,
          credentials: {
            openai: { apiKey: "sk-offline-fixture", baseURL: server.baseURL },
          },
          tools: probeTool(schema),
        });
      } catch {
        threw = true;
      }
      const body = server.getAllRequestBodies().slice(before)[0];
      const tools: OpenAiWireTool[] = body
        ? (JSON.parse(body).tools ?? [])
        : [];
      const probe = tools.find((t) => t.function?.name === "probe");
      seen[name] = JSON.stringify(
        probe ? probe.function?.parameters : NOT_SENT(threw),
      );
    }
  } finally {
    await server.close();
  }
  return seen;
}

/** One streamed text turn in the SSE framing the @google/genai SDK expects. */
const GEMINI_TEXT_TURN = `data: ${JSON.stringify({
  candidates: [
    {
      content: { parts: [{ text: "ok" }], role: "model" },
      finishReason: "STOP",
      index: 0,
    },
  ],
  usageMetadata: {
    promptTokenCount: 5,
    candidatesTokenCount: 1,
    totalTokenCount: 6,
  },
})}\r\n\r\n`;

async function startGeminiStandIn() {
  const bodies: string[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      bodies.push(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200, {
        "content-type": "text/event-stream",
        connection: "close",
      });
      res.end(GEMINI_TEXT_TURN);
    });
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const { port } = server.address() as AddressInfo;
  return {
    baseURL: `http://127.0.0.1:${port}`,
    bodies,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}

async function captureGeminiNative(): Promise<Record<string, string>> {
  // An ambient base URL would redirect the SDK somewhere other than the stand-in.
  delete process.env.GOOGLE_AI_BASE_URL;
  const server = await startGeminiStandIn();
  const sdk = new NeuroLink();
  const seen: Record<string, string> = {};
  try {
    for (const [name, schema] of Object.entries(SHAPES)) {
      const before = server.bodies.length;
      let threw = false;
      try {
        await sdk.generate({
          input: { text: "hi" },
          provider: "google-ai",
          model: "gemini-2.0-flash",
          maxSteps: 1,
          disableInternalFallback: true,
          credentials: {
            googleAiStudio: {
              apiKey: "offline-fixture-key",
              baseURL: server.baseURL,
            },
          },
          tools: probeTool(schema),
        });
      } catch {
        threw = true;
      }
      const body = server.bodies.slice(before)[0];
      const tools: GeminiWireTool[] = body
        ? (JSON.parse(body).tools ?? [])
        : [];
      const declaration = tools
        .flatMap((t) => t.functionDeclarations ?? [])
        .find((d) => d.name === "probe");
      // Pin the whole declaration but for the two fields the suite sets itself,
      // so the key the schema travels under (parametersJsonSchema or parameters)
      // is part of what is compared.
      const {
        name: _name,
        description: _description,
        ...schemaFields
      } = declaration ?? {};
      seen[name] = JSON.stringify(declaration ? schemaFields : NOT_SENT(threw));
    }
  } finally {
    await server.close();
  }
  return seen;
}

const ROUTES: Record<string, () => Promise<Record<string, string>>> = {
  "openai-compatible": captureOpenAiCompatible,
  "gemini-native": captureGeminiNative,
};

const wire: Record<string, Record<string, string>> = {};
for (const [route, capture] of Object.entries(ROUTES)) {
  wire[route] = await capture();
}

if (updating) {
  const pinnedOut = Object.fromEntries(
    Object.entries(wire).map(([route, shapes]) => [
      route,
      Object.fromEntries(
        Object.entries(shapes).map(([k, v]) => [k, JSON.parse(v)]),
      ),
    ]),
  );
  writeFileSync(FIXTURE, `${JSON.stringify(pinnedOut, null, 2)}\n`);
  console.log(
    `wrote ${Object.keys(SHAPES).length} pinned shapes for ${Object.keys(ROUTES).length} routes to ${FIXTURE}`,
  );
}

const pinned: Record<string, Record<string, unknown>> = existsSync(FIXTURE)
  ? JSON.parse(readFileSync(FIXTURE, "utf8"))
  : {};

for (const route of Object.keys(ROUTES)) {
  const routePins = pinned[route] ?? {};

  await test(`${route}: every shape has a pinned wire schema`, async () => {
    const missing = Object.keys(SHAPES).filter((k) => !(k in routePins));
    assert(
      missing.length === 0,
      `no pinned schema for: ${missing.join(", ")} (run with UPDATE_ZOD_WIRE_FIXTURE=1 after reviewing)`,
    );
    const stale = Object.keys(routePins).filter((k) => !(k in SHAPES));
    assert(
      stale.length === 0,
      `pinned schemas with no shape: ${stale.join(", ")}`,
    );
  });

  for (const name of Object.keys(SHAPES)) {
    await test(`${route}: wire schema ${name}`, async () => {
      assert(
        name in routePins,
        "no pinned schema for this shape, so there is nothing to compare",
      );
      assert(
        wire[route][name] === JSON.stringify(routePins[name]),
        "the schema sent to the provider differs from the pinned one (zod or the converter changed it); review it, then update the pin",
      );
    });
  }
}

await runSuite();
