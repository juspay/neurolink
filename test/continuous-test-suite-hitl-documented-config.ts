#!/usr/bin/env tsx
/**
 * The HITL configuration and approval flow the README and docs index show must
 * be the one the shipped SDK implements. This suite lifts the `hitl` literal
 * out of both pages and constructs a real NeuroLink from it, runs the
 * documented event flow through `registerTool()` / `executeTool()`, and pins
 * the claims the docs make about what HITL does not do: unknown keys are
 * dropped, audit events stay on the HITLManager, and the removed enterprise
 * shape does not construct. The documented handlers are compiled with strict
 * TypeScript against `dist/index.d.ts`, every enterprise-page heading whose
 * code uses an unimplemented key must be marked `(Planned)`, no doc example
 * may enable HITL without `dangerousActions`, and every documented
 * `hitl:confirmation-response` must satisfy `ConfirmationResponseEvent`
 * (including the `metadata` the type requires) with a measured `responseTime`.
 * The init logs must report the `allowArgumentModification` the approval
 * request carries.
 *
 * Offline: no provider is called; tools are local fixtures.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { HITLManager, NeuroLink, logger } from "../dist/index.js";
import {
  assert,
  assertEqual,
  assertIncludes,
  assertNotNull,
  defineSuite,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("HITL documented configuration", {
  offline: true,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECTION_HEADING = "## Enterprise Security: Human-in-the-Loop (HITL)";
const UNIMPLEMENTED_KEYS = [
  "requireApproval",
  "reviewCallback",
  "statusCallback",
  "confidenceThreshold",
  "contentPatterns",
  "escalationPolicy",
] as const;

const readHitlFence = (file: string): string => {
  const text = readFileSync(join(REPO_ROOT, file), "utf8");
  const start = text.indexOf(SECTION_HEADING);
  assert(start >= 0, `${file}: HITL section heading not found`);
  const afterHeading = text.slice(start + SECTION_HEADING.length);
  const nextSection = afterHeading.search(/\n## /);
  const section =
    nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection);
  const fence = /```typescript\n([\s\S]*?)\n```/.exec(section);
  assertNotNull(fence, `${file}: HITL section has no typescript example`);
  return fence[1];
};

const readDocumentedConfig = (file: string): { hitl: object } => {
  const literal = /new NeuroLink\((\{[\s\S]*?\n\})\);/.exec(
    readHitlFence(file),
  );
  assertNotNull(literal, `${file}: no new NeuroLink({...}) in the example`);
  const config: unknown = new Function(`return (${literal[1]});`)();
  if (
    typeof config !== "object" ||
    config === null ||
    !("hitl" in config) ||
    typeof config.hitl !== "object" ||
    config.hitl === null
  ) {
    throw new Error(`${file}: example config has no hitl object`);
  }
  return { hitl: config.hitl };
};

const readPayload = (event: unknown): Record<string, unknown> => {
  if (
    typeof event !== "object" ||
    event === null ||
    !("payload" in event) ||
    typeof event.payload !== "object" ||
    event.payload === null
  ) {
    throw new Error("HITL event has no payload object");
  }
  return Object.fromEntries(Object.entries(event.payload));
};

const DOC_PAGES = ["README.md", "docs/index.md"] as const;

for (const page of DOC_PAGES) {
  await test(`${page}: the example hitl config constructs a NeuroLink`, async () => {
    const { hitl } = readDocumentedConfig(page);
    assert(
      "enabled" in hitl && hitl.enabled === true,
      `${page}: example does not enable HITL`,
    );
    assert(
      "dangerousActions" in hitl &&
        Array.isArray(hitl.dangerousActions) &&
        hitl.dangerousActions.length > 0,
      `${page}: example omits dangerousActions, which the constructor requires`,
    );
    new NeuroLink({ hitl } as ConstructorParameters<typeof NeuroLink>[0]);
  });

  await test(`${page}: the example code names no unimplemented HITL key`, async () => {
    const fence = readHitlFence(page);
    for (const key of UNIMPLEMENTED_KEYS) {
      assert(
        !fence.includes(key),
        `${page}: the HITL example still uses unimplemented key ${key}`,
      );
    }
  });
}

await test("the enterprise shape the docs used to show does not construct", async () => {
  const legacy = {
    enabled: true,
    requireApproval: ["writeFile", "executeCode", "sendEmail"],
    confidenceThreshold: 0.85,
    reviewCallback: async () => true,
  };
  let name = "";
  try {
    // @ts-expect-error -- dangerousActions is required and the other keys are not HITLConfig keys
    new NeuroLink({ hitl: legacy });
  } catch (error) {
    name = error instanceof Error ? error.name : String(error);
  }
  assertEqual(name, "HITLConfigurationError");
});

await test("unknown hitl keys are dropped without an error and gate nothing", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["delete"],
    // @ts-expect-error -- not a HITLConfig key; the docs say it is ignored
    requireApproval: ["writeFile"],
  });
  assert(
    !("requireApproval" in manager.getConfig()),
    "requireApproval survived validateConfig",
  );
  assertEqual(manager.requiresConfirmation("writeFile", {}), false);
  assertEqual(manager.requiresConfirmation("deleteFile", {}), true);
});

await test("dangerousActions is a case-insensitive substring match on the tool name", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["writeFile"],
  });
  assertEqual(manager.requiresConfirmation("writeFile"), true);
  assertEqual(manager.requiresConfirmation("PREFIX_WRITEFILE_V2"), true);
  assertEqual(manager.requiresConfirmation("readFile"), false);
});

await test("defaults match the docs: 30s timeout, reject on timeout, allowModification advertised as false", async () => {
  const config = new HITLManager({
    enabled: true,
    dangerousActions: ["delete"],
  }).getConfig();
  assertEqual(config.timeout, 30000);
  assertEqual(config.allowArgumentModification, false);
  assertEqual(config.autoApproveOnTimeout, false);
  assertEqual(config.confirmationMethod, "event");
  assertEqual(config.auditLogging, false);
});

await test("enabled without dangerousActions throws HITLConfigurationError", async () => {
  let name = "";
  try {
    new NeuroLink({ hitl: { enabled: true } as never });
  } catch (error) {
    name = error instanceof Error ? error.name : String(error);
  }
  assertEqual(name, "HITLConfigurationError");
});

// executeTool() reports a refused call as { success: false } rather than throwing
const isRefused = (result: unknown): boolean =>
  typeof result === "object" &&
  result !== null &&
  "success" in result &&
  result.success === false;

type ToolFixture = {
  neurolink: NeuroLink;
  executions: () => number;
  received: () => unknown[];
  requests: () => Array<Record<string, unknown>>;
};

const createFixture = (
  hitl: {
    timeout?: number;
    auditLogging?: boolean;
    allowArgumentModification?: boolean;
  },
  decide: ((payload: Record<string, unknown>) => boolean) | null,
  modifiedArguments?: unknown,
): ToolFixture => {
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["fixture_write"], ...hitl },
  });
  let executions = 0;
  const received: unknown[] = [];
  for (const name of ["fixture_write", "fixture_read"]) {
    neurolink.registerTool(name, {
      name,
      description: "Harmless local HITL fixture",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async (args: unknown) => {
        executions++;
        received.push(args);
        return "fixture executed";
      },
    });
  }
  const requests: Array<Record<string, unknown>> = [];
  const emitter = neurolink.getEventEmitter();
  emitter.on("hitl:confirmation-request", (event) => {
    const payload = readPayload(event);
    requests.push(payload);
    if (decide === null) {
      return;
    }
    const approved = decide(payload);
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: payload.confirmationId,
        approved,
        reason: approved ? undefined : "Rejected by reviewer",
        ...(modifiedArguments === undefined ? {} : { modifiedArguments }),
      },
    });
  });
  return {
    neurolink,
    executions: () => executions,
    received: () => received,
    requests: () => requests,
  };
};

await test("documented flow: a matching tool waits for the event answer, then runs", async () => {
  const fixture = createFixture({ timeout: 5000 }, () => true);
  await fixture.neurolink.executeTool("fixture_write", {});
  assertEqual(fixture.executions(), 1);
  assertEqual(fixture.requests().length, 1);
  const payload = fixture.requests()[0];
  assertEqual(payload.toolName, "fixture_write");
  assertEqual(typeof payload.confirmationId, "string");
  assertEqual(payload.timeoutMs, 5000);
  assertEqual(payload.allowModification, false);
  assert("arguments" in payload, "request payload has no arguments");
});

await test("documented flow: a tool that does not match never asks", async () => {
  const fixture = createFixture({ timeout: 5000 }, () => true);
  await fixture.neurolink.executeTool("fixture_read", {});
  assertEqual(fixture.executions(), 1);
  assertEqual(fixture.requests().length, 0);
});

await test("documented flow: a rejection stops the tool from running", async () => {
  const fixture = createFixture({ timeout: 5000 }, () => false);
  const result = await fixture.neurolink.executeTool("fixture_write", {});
  assert(isRefused(result), "A rejected tool call was reported as success");
  assertEqual(fixture.executions(), 0);
});

await test("documented flow: with no answer the call times out and does not run", async () => {
  const fixture = createFixture({ timeout: 50 }, null);
  let timeouts = 0;
  fixture.neurolink.getEventEmitter().on("hitl:timeout", () => void timeouts++);
  const result = await fixture.neurolink.executeTool("fixture_write", {});
  assert(isRefused(result), "An unanswered tool call was reported as success");
  assertEqual(fixture.executions(), 0);
  assertEqual(timeouts, 1);
});

// The init logs are what an operator reads to learn the effective policy, so
// they must report the value the approval request will carry, not their own
// guess at the default.
type LoggedCall = { message: string; data: Record<string, unknown> };

const captureLogs = <T>(build: () => T): { result: T; calls: LoggedCall[] } => {
  const calls: LoggedCall[] = [];
  const original = { debug: logger.debug, info: logger.info };
  const record = (...args: unknown[]): void => {
    const [message, data] = args;
    calls.push({
      message: String(message),
      data:
        typeof data === "object" && data !== null
          ? Object.fromEntries(Object.entries(data))
          : {},
    });
  };
  logger.debug = record;
  logger.info = record;
  try {
    return { result: build(), calls };
  } finally {
    logger.debug = original.debug;
    logger.info = original.info;
  }
};

const loggedAllowModification = (
  calls: LoggedCall[],
): { started: unknown; enabled: unknown } => {
  const started = calls.find((call) =>
    call.message.includes("LOG_POINT_C015_HITL_INIT_START"),
  );
  const enabled = calls.find((call) =>
    call.message.includes("HITL safety features enabled"),
  );
  assertNotNull(started, "no HITL init start log was captured");
  assertNotNull(enabled, "no HITL enabled log was captured");
  const startedConfig = started.data.hitlConfig;
  if (typeof startedConfig !== "object" || startedConfig === null) {
    throw new Error("the init start log has no hitlConfig object");
  }
  return {
    started: Object.fromEntries(Object.entries(startedConfig))
      .allowArgumentModification,
    enabled: enabled.data.allowArgumentModification,
  };
};

for (const configured of [undefined, false, true] as const) {
  await test(`init logs report allowArgumentModification=${configured ?? "(omitted)"} as the request event does`, async () => {
    const { result: fixture, calls } = captureLogs(() =>
      createFixture(
        {
          timeout: 5000,
          ...(configured === undefined
            ? {}
            : { allowArgumentModification: configured }),
        },
        () => true,
      ),
    );
    await fixture.neurolink.executeTool("fixture_write", {});
    const advertised = fixture.requests()[0].allowModification;
    assertEqual(advertised, configured ?? false);
    const logged = loggedAllowModification(calls);
    assertEqual(logged.started, advertised);
    assertEqual(logged.enabled, advertised);
  });
}

await test("auditLogging emits hitl:audit on the HITLManager, not on the NeuroLink emitter", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    auditLogging: true,
  });
  const managerEntries: string[] = [];
  manager.on("hitl:audit", (entry: { eventType: string }) => {
    managerEntries.push(entry.eventType);
  });
  manager.on("hitl:confirmation-request", (event) => {
    manager.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId: event.payload.confirmationId, approved: true },
    });
  });
  await manager.requestConfirmation("fixture_write", {});
  // A synchronous answer lands before the request entry is written, so the
  // order is not part of the contract; the set of entries is.
  assertEqual(
    [...managerEntries].sort().join(","),
    "confirmation-approved,confirmation-requested",
  );

  const fixture = createFixture(
    { timeout: 5000, auditLogging: true },
    () => true,
  );
  let forwarded = 0;
  fixture.neurolink.getEventEmitter().on("hitl:audit", () => void forwarded++);
  await fixture.neurolink.executeTool("fixture_write", {});
  assertEqual(fixture.executions(), 1);
  assertEqual(forwarded, 0);
});

// A response's modifiedArguments is applied whatever allowArgumentModification
// says; the docs must not describe the flag as a gate.
await test("allowArgumentModification is advertised to the UI but does not gate modifiedArguments", async () => {
  const fixture = createFixture({ timeout: 5000 }, () => true, {
    path: "/tmp/edited",
  });
  await fixture.neurolink.executeTool("fixture_write", { path: "/tmp/asked" });
  assertEqual(fixture.requests()[0].allowModification, false);
  assertEqual(JSON.stringify(fixture.received()), '[{"path":"/tmp/edited"}]');
});

for (const page of [...DOC_PAGES, "docs/features/enterprise-hitl.md"]) {
  await test(`${page}: says allowArgumentModification is not enforced`, async () => {
    const text = readFileSync(join(REPO_ROOT, page), "utf8");
    assertIncludes(text, "NeuroLink does not enforce it");
    assert(
      !/approver (may not|can) edit/i.test(text),
      `${page}: still describes allowArgumentModification as a gate`,
    );
  });
}

await test("auditLogging entries carry the full tool arguments, as the docs warn", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    auditLogging: true,
  });
  const entries: Array<{ eventType: string; arguments?: unknown }> = [];
  manager.on(
    "hitl:audit",
    (entry: { eventType: string; arguments?: unknown }) => {
      entries.push(entry);
    },
  );
  manager.on("hitl:confirmation-request", (event) => {
    manager.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId: event.payload.confirmationId, approved: true },
    });
  });
  await manager.requestConfirmation("fixture_write", { token: "s3cret" });
  const requested = entries.find(
    (entry) => entry.eventType === "confirmation-requested",
  );
  assertNotNull(requested, "no confirmation-requested audit entry");
  assertEqual(JSON.stringify(requested.arguments), '{"token":"s3cret"}');
  assertIncludes(
    readFileSync(join(REPO_ROOT, "docs/features/enterprise-hitl.md"), "utf8"),
    "redact secrets and personal data at the logger sink",
  );
});

// ---------------------------------------------------------------------------
// The documented handlers must compile under strict TypeScript
// ---------------------------------------------------------------------------

type Fence = {
  lang: string;
  body: string;
  line: number;
  heading: string;
};

const extractFences = (text: string): Fence[] => {
  const fences: Fence[] = [];
  let heading = "";
  let open: { lang: string; line: number; body: string[] } | null = null;
  for (const [index, raw] of text.split("\n").entries()) {
    if (open === null) {
      const opening = /^```(\w*)/.exec(raw);
      if (opening !== null) {
        open = { lang: opening[1], line: index + 1, body: [] };
        continue;
      }
      const title = /^#{1,6}\s+(.*)$/.exec(raw);
      if (title !== null) {
        heading = title[1];
      }
    } else if (/^```\s*$/.test(raw)) {
      fences.push({
        lang: open.lang,
        body: open.body.join("\n"),
        line: open.line,
        heading,
      });
      open = null;
    } else {
      open.body.push(raw);
    }
  }
  return fences;
};

const TS_LANGS = new Set(["ts", "typescript"]);
const readText = (file: string): string =>
  readFileSync(join(REPO_ROOT, file), "utf8");

const tsFences = (file: string): Fence[] =>
  extractFences(readText(file)).filter((fence) => TS_LANGS.has(fence.lang));

// Names the doc snippets use without declaring: stand-ins for the reader's own code
const SNIPPET_PRELUDE = `
declare const yourApprovalSystem: {
  requestReview(request: Record<string, unknown>): Promise<boolean>;
};
declare function askUser(payload: unknown): Promise<boolean>;
declare function promptUserForApproval(payload: unknown): Promise<boolean>;
`;

const withImports = (code: string): string =>
  /import[^;]*\bNeuroLink\b[^;]*from/.test(code)
    ? code
    : `import { NeuroLink } from "@juspay/neurolink";\n${code}`;

const readJsdocHitlExample = (): string => {
  const source = readText("src/lib/neurolink.ts");
  const start = source.indexOf("@example With HITL security");
  assert(start >= 0, "neurolink.ts: HITL JSDoc example not found");
  const open = source.indexOf("```typescript\n", start);
  const close = source.indexOf("```", open + 14);
  return source
    .slice(open + 14, close)
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n");
};

const readHitlSnippets = (): Array<{ name: string; code: string }> => {
  // Only the approval-handler example; the page's other fences are not about HITL
  const showcase = tsFences("docs/features/mcp-tools-showcase.md").filter(
    (fence) => fence.body.includes("hitl:confirmation-request"),
  );
  // Handler examples in the security policy and the skills guide
  const security = tsFences("SECURITY.md").filter((fence) =>
    fence.body.includes("hitl:confirmation-request"),
  );
  const skills = tsFences(
    "docs/skills/neurolink-guide/advanced-features.md",
  ).filter((fence) => fence.body.includes("hitl:confirmation-request"));
  assert(security.length > 0, "SECURITY.md: no HITL handler example found");
  assert(skills.length > 0, "skills guide: no HITL handler example found");
  const available = extractFences(readText("docs/features/enterprise-hitl.md"))
    .filter((fence) => TS_LANGS.has(fence.lang))
    .filter((fence) => fence.heading === "Currently available");
  return [
    { name: "README.md", code: readHitlFence("README.md") },
    { name: "docs/index.md", code: readHitlFence("docs/index.md") },
    ...showcase.map((fence) => ({
      name: `mcp-tools-showcase.md:${fence.line}`,
      code: fence.body,
    })),
    {
      name: "enterprise-hitl.md (Currently available)",
      code: available.map((fence) => fence.body).join("\n"),
    },
    ...security.map((fence) => ({
      name: `SECURITY.md:${fence.line}`,
      code: fence.body,
    })),
    // The skills-guide fence continues an earlier block that defines neurolink
    ...skills.map((fence) => ({
      name: `advanced-features.md:${fence.line}`,
      code: `declare const neurolink: import("@juspay/neurolink").NeuroLink;\n${fence.body}`,
    })),
    { name: "neurolink.ts JSDoc", code: readJsdocHitlExample() },
  ].map(({ name, code }) => ({
    name,
    code: `${withImports(code)}\n${SNIPPET_PRELUDE}`,
  }));
};

// The pre-fix handler: listener arguments are unknown, so `event.payload` must fail
const UNNARROWED_HANDLER = `
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();
neurolink.getEventEmitter().on("hitl:confirmation-request", async (event) => {
  const { confirmationId } = event.payload;
  return confirmationId;
});
`;

// The reply a handler must send: `metadata` is required by the type, so a
// documented reply that omits it must fail to compile, not just read oddly
const RESPONSE_WITHOUT_METADATA = `
import { NeuroLink, type ConfirmationResponseEvent } from "@juspay/neurolink";
const emitter = new NeuroLink().getEventEmitter();
emitter.emit("hitl:confirmation-response", {
  type: "hitl:confirmation-response",
  payload: { confirmationId: "id", approved: true },
} satisfies ConfirmationResponseEvent);
`;

const RESPONSE_WITH_METADATA = `
import { NeuroLink, type ConfirmationResponseEvent } from "@juspay/neurolink";
const emitter = new NeuroLink().getEventEmitter();
emitter.emit("hitl:confirmation-response", {
  type: "hitl:confirmation-response",
  payload: {
    confirmationId: "id",
    approved: true,
    metadata: { timestamp: new Date().toISOString(), responseTime: 12 },
  },
} satisfies ConfirmationResponseEvent);
`;

const compileSnippets = (
  snippets: ReadonlyArray<{ name: string; code: string }>,
  realFiles: ReadonlyArray<string>,
): Map<string, string[]> => {
  const dir = tempDir("hitl-doc-snippets-");
  mkdirSync(dir, { recursive: true });
  const rootNames = snippets.map(({ name, code }, index) => {
    const file = join(dir, `snippet-${index}.ts`);
    writeFileSync(file, code);
    return file;
  });
  const program = ts.createProgram({
    rootNames: [...rootNames, ...realFiles],
    options: {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      typeRoots: [join(REPO_ROOT, "node_modules/@types")],
      types: ["node"],
      paths: { "@juspay/neurolink": [join(REPO_ROOT, "dist/index.d.ts")] },
    },
  });
  const diagnosticsFor = (file: string): string[] => {
    const source = program.getSourceFile(file);
    assertNotNull(source, `${file}: not part of the program`);
    return [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ].map((diagnostic) => {
      const where =
        diagnostic.start === undefined
          ? 0
          : source.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        " ",
      );
      return `TS${diagnostic.code} line ${where}: ${message}`;
    });
  };
  return new Map([
    ...snippets.map(({ name }, index): [string, string[]] => [
      name,
      diagnosticsFor(rootNames[index]),
    ]),
    ...realFiles.map((file): [string, string[]] => [
      file,
      diagnosticsFor(file),
    ]),
  ]);
};

const EXAMPLE_APP_CONFIG = join(
  REPO_ROOT,
  "examples/projects/enterprise-app/src/config/neurolink.config.ts",
);
const hitlSnippets = readHitlSnippets();
const compiled = compileSnippets(
  [
    ...hitlSnippets,
    { name: "unnarrowed handler", code: UNNARROWED_HANDLER },
    { name: "response without metadata", code: RESPONSE_WITHOUT_METADATA },
    { name: "response with metadata", code: RESPONSE_WITH_METADATA },
  ],
  [EXAMPLE_APP_CONFIG],
);

await test("type-check control: an unnarrowed event.payload is rejected as unknown (TS18046)", async () => {
  const diagnostics = compiled.get("unnarrowed handler") ?? [];
  assert(
    diagnostics.some((message) => message.startsWith("TS18046")),
    `the control did not fail as expected: ${diagnostics.join(" | ") || "no diagnostics"}`,
  );
});

await test("type-check control: a response without metadata does not satisfy ConfirmationResponseEvent (TS2741)", async () => {
  const diagnostics = compiled.get("response without metadata") ?? [];
  assert(
    diagnostics.some((message) => message.startsWith("TS2741")),
    `the control did not fail as expected: ${diagnostics.join(" | ") || "no diagnostics"}`,
  );
});

await test("type-check control: a response with metadata satisfies ConfirmationResponseEvent", async () => {
  const diagnostics = compiled.get("response with metadata") ?? [
    "not compiled",
  ];
  assertEqual(diagnostics.join("\n"), "");
});

const RESPONSE_EMIT = /\.emit\(\s*["']hitl:confirmation-response["']/;

await test("every documented handler checks its reply against ConfirmationResponseEvent", async () => {
  const emitting = hitlSnippets.filter(({ code }) => RESPONSE_EMIT.test(code));
  assert(
    emitting.length >= 7,
    `only ${emitting.length} snippets emit a reply, so the check measured too little`,
  );
  const unchecked = emitting
    .filter(({ code }) => !code.includes("satisfies ConfirmationResponseEvent"))
    .map(({ name }) => name);
  assertEqual(unchecked.join(" | "), "");
});

for (const { name } of hitlSnippets) {
  await test(`${name}: the documented HITL example type-checks under strict TypeScript`, async () => {
    const diagnostics = compiled.get(name) ?? ["not compiled"];
    assertEqual(diagnostics.join("\n"), "");
  });
}

await test("examples/projects/enterprise-app config type-checks against the shipped types", async () => {
  const diagnostics = compiled.get(EXAMPLE_APP_CONFIG) ?? ["not compiled"];
  assertEqual(diagnostics.join("\n"), "");
});

// ---------------------------------------------------------------------------
// Enterprise page: every heading whose code uses an unimplemented key is marked
// ---------------------------------------------------------------------------

const PLANNED_KEYS =
  /\b(requireApproval|reviewCallback|statusCallback|confidenceThreshold|contentPatterns|escalationPolicy|auditLog|requireApprovalFor)\b|\bmode:\s*["'](a?synchronous)/;
const CODE_LANGS = new Set([
  "",
  "ts",
  "typescript",
  "js",
  "javascript",
  "tsx",
  "json",
  "yaml",
  "bash",
]);

const headingsUsingPlannedKeys = (
  markdown: string,
): Array<{ heading: string; marked: boolean }> => {
  const found = new Map<string, boolean>();
  for (const fence of extractFences(markdown)) {
    if (CODE_LANGS.has(fence.lang) && PLANNED_KEYS.test(fence.body)) {
      found.set(fence.heading, fence.heading.includes("(Planned)"));
    }
  }
  return [...found].map(([heading, marked]) => ({ heading, marked }));
};

await test("planned-marker control: an unmarked heading with reviewCallback code is flagged", async () => {
  const sample = [
    "### Marked (Planned)",
    "```typescript",
    "const a = { reviewCallback: () => true };",
    "```",
    "### Unmarked",
    "```typescript",
    "const b = { reviewCallback: () => true };",
    "```",
  ].join("\n");
  assertEqual(
    JSON.stringify(headingsUsingPlannedKeys(sample)),
    '[{"heading":"Marked (Planned)","marked":true},{"heading":"Unmarked","marked":false}]',
  );
});

await test("enterprise-hitl.md: every heading with unimplemented-key code is marked (Planned)", async () => {
  const hits = headingsUsingPlannedKeys(
    readText("docs/features/enterprise-hitl.md"),
  );
  assert(hits.length > 0, "the scan found no headings, so it measured nothing");
  const unmarked = hits
    .filter(({ marked }) => !marked)
    .map(({ heading }) => heading);
  assertEqual(unmarked.join(" | "), "");
});

// ---------------------------------------------------------------------------
// No doc example may enable HITL without the required dangerousActions
// ---------------------------------------------------------------------------

const enabledWithoutDangerousActions = (code: string): boolean => {
  for (const opening of code.matchAll(/\bhitl\s*:\s*\{/g)) {
    const start = opening.index + opening[0].length;
    let depth = 1;
    let end = start;
    while (end < code.length && depth > 0) {
      depth += (code[end] === "{" ? 1 : 0) - (code[end] === "}" ? 1 : 0);
      end++;
    }
    const literal = code.slice(start, end);
    if (
      /\benabled\s*:\s*true/.test(literal) &&
      !literal.includes("dangerousActions")
    ) {
      return true;
    }
  }
  return false;
};

await test("dangerousActions control: an enabled hitl literal without it is flagged", async () => {
  assertEqual(
    enabledWithoutDangerousActions(
      "new NeuroLink({ hitl: { enabled: true } })",
    ),
    true,
  );
  assertEqual(
    enabledWithoutDangerousActions(
      'new NeuroLink({ hitl: { enabled: true, dangerousActions: ["x"] } })',
    ),
    false,
  );
});

await test("mcp-tools-showcase.md uses no unimplemented HITL key", async () => {
  const hits = headingsUsingPlannedKeys(
    readText("docs/features/mcp-tools-showcase.md"),
  );
  assertEqual(hits.map(({ heading }) => heading).join(" | "), "");
});

const userDocFiles = (): string[] => [
  "README.md",
  "SECURITY.md",
  ...readdirSync(join(REPO_ROOT, "docs"), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".md") && !file.startsWith("api/"))
    .map((file) => `docs/${file}`),
];

await test("no doc example enables HITL without dangerousActions", async () => {
  // The enterprise page is a design sketch; the planned-marker test covers it
  const sketch = "docs/features/enterprise-hitl.md";
  const files = userDocFiles().filter((file) => file !== sketch);
  const offenders = files.flatMap((file) =>
    extractFences(readText(file))
      .filter((fence) => enabledWithoutDangerousActions(fence.body))
      .map((fence) => `${file}:${fence.line}`),
  );
  assertEqual(offenders.join(", "), "");
});

// ---------------------------------------------------------------------------
// Every documented reply carries the metadata the type requires
// ---------------------------------------------------------------------------

const RESPONSE_EMITS = new RegExp(RESPONSE_EMIT.source, "g");

// The text from the `(` or `{` at `open` to its matching close. Strings,
// template literals and comments are skipped, so a `)` in "Press ) to close" or
// an apostrophe in a `//` comment does not end the scan early.
const bracketed = (code: string, open: number): string => {
  const opener = code[open];
  const closer = opener === "(" ? ")" : "}";
  let depth = 0;
  let quote: string | undefined;
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i];
    if (quote !== undefined) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === quote) {
        quote = undefined;
      }
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (code.startsWith("//", i)) {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
    } else if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? code.length : end + 1;
    } else if (ch === opener) {
      depth += 1;
    } else if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        return code.slice(open, i + 1);
      }
    }
  }
  return code.slice(open);
};

// One emitted event's `payload: { … }` object literal. A payload passed as a
// variable cannot be read from text, so the whole argument list stands in.
const emittedPayload = (code: string, from: number): string => {
  const args = bracketed(code, code.indexOf("(", from));
  const key = /\bpayload\s*:\s*\{/.exec(args);
  return key === null ? args : bracketed(args, key.index + key[0].length - 1);
};

// Text-level, so it also covers the pages whose fences are not compiled
const replyProblems = (code: string): string[] => {
  const payloads = [...code.matchAll(RESPONSE_EMITS)].map((match) =>
    emittedPayload(code, match.index),
  );
  if (payloads.length === 0) {
    return [];
  }
  const problems: string[] = [];
  // Looked for in each emitted payload, so a `metadata` built elsewhere in the
  // fence, or set beside the payload instead of in it, cannot stand in for one
  // the payload leaves out. `metadata,` shorthand counts: the object literal is
  // still checked by `satisfies`
  if (!payloads.every((payload) => /\bmetadata\s*[:,}]/.test(payload))) {
    problems.push("no metadata");
  }
  if (!/\btimestamp\s*:/.test(code)) {
    problems.push("no metadata.timestamp");
  }
  if (!/\bresponseTime\s*:/.test(code)) {
    problems.push("no metadata.responseTime");
  }
  if (/\bresponseTime\s*:\s*(0|Date\.now\(\))\s*[,}\n]/.test(code)) {
    problems.push("responseTime is not elapsed time");
  }
  return problems;
};

await test("reply control: a reply with no metadata, a zero or an epoch responseTime is flagged", async () => {
  const emit = (payload: string): string =>
    `emitter.emit("hitl:confirmation-response", { type: "hitl:confirmation-response", payload: { ${payload} } });`;
  assertEqual(replyProblems("emitter.on('x', () => {})").length, 0);
  assertEqual(
    replyProblems(emit("confirmationId, approved")).join(", "),
    "no metadata, no metadata.timestamp, no metadata.responseTime",
  );
  assertEqual(
    replyProblems(
      emit(
        "metadata: { timestamp: new Date().toISOString(), responseTime: 0 }",
      ),
    ).join(", "),
    "responseTime is not elapsed time",
  );
  assertEqual(
    replyProblems(
      emit(
        "metadata: { timestamp: new Date().toISOString(), responseTime: Date.now(), }",
      ),
    ).join(", "),
    "responseTime is not elapsed time",
  );
  assertEqual(
    replyProblems(
      emit(
        "metadata: { timestamp: new Date().toISOString(), responseTime: Date.now() - receivedAt }",
      ),
    ).join(", "),
    "",
  );
  const built =
    "const metadata = { timestamp: new Date().toISOString(), responseTime: Date.now() - receivedAt };\n";
  assertEqual(
    replyProblems(built + emit("confirmationId, approved")).join(", "),
    "no metadata",
  );
  assertEqual(
    replyProblems(built + emit("confirmationId, approved, metadata")).join(
      ", ",
    ),
    "",
  );
  assertEqual(
    replyProblems(
      built +
        emit("confirmationId, approved: true, metadata") +
        "\n" +
        emit("confirmationId, approved: false"),
    ).join(", "),
    "no metadata",
  );
  assertEqual(
    replyProblems(
      built +
        `emitter.emit("hitl:confirmation-response", { type: "hitl:confirmation-response", payload: { confirmationId, approved }, metadata });`,
    ).join(", "),
    "no metadata",
  );
  const measured =
    "metadata: { timestamp: new Date().toISOString(), responseTime: Date.now() - receivedAt }";
  assertEqual(
    replyProblems(
      emit(`note: "Press ) to close", label: 'a } brace', ${measured}`),
    ).join(", "),
    "",
  );
  assertEqual(
    replyProblems(
      emit(`// the reviewer's call (and a stray ")")\n${measured}`),
    ).join(", "),
    "",
  );
});

await test("every documented hitl:confirmation-response carries timestamp and a measured responseTime", async () => {
  const offenders = [
    ...userDocFiles().flatMap((file) =>
      extractFences(readText(file))
        .filter((fence) => TS_LANGS.has(fence.lang))
        .map((fence) => ({
          where: `${file}:${fence.line}`,
          problems: replyProblems(fence.body),
        })),
    ),
    {
      where: "examples/projects/enterprise-app",
      problems: replyProblems(readFileSync(EXAMPLE_APP_CONFIG, "utf8")),
    },
    {
      where: "neurolink.ts JSDoc",
      problems: replyProblems(readJsdocHitlExample()),
    },
  ]
    .filter(({ problems }) => problems.length > 0)
    .map(({ where, problems }) => `${where} (${problems.join(", ")})`);
  assertEqual(offenders.join(" | "), "");
});

await runSuite();
