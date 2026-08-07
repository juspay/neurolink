#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Skills
 *
 * Tests the native skills subsystem end-to-end:
 * - Built-in tool registration (list_skills, gated mutation tools) and the
 *   per-call use_skill / read_skill_resource injection (discovery listing)
 * - InMemory + FileSystem stores (JSON, frontmatter .md, <dir>/SKILL.md
 *   layouts, bundled resources)
 * - S3 store (hermetic via injected object ops: round-trip, index upsert,
 *   self-heal, ETag-conditional refresh, resources, fail-open errors)
 * - Redis store (round-trip + SCAN index; SKIPs when Redis is unreachable)
 * - Custom store plug-in
 * - Search semantics on the manager (scope/tag filters, maxMatches)
 * - Activation + session pinning (already_loaded dedup, pinned history
 *   messages, summarization/truncation survival, preload, version pinning)
 * - Listing budget (description shortening, names never dropped, sorted)
 * - Mutation gate (approve / reject / pending / direct apply, soft delete, version bump)
 * - CLI: skills create/list/show/search/delete + --skills-dir flag
 * - Server routes: /api/agent/skills CRUD handlers + 503 when unconfigured
 * - Live generate() with skills (SKIPs without provider credentials)
 *
 * Most tests are no-API. Run: npx tsx test/continuous-test-suite-skills.ts [--provider=vertex]
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { NeuroLink, RedisSkillStore, S3SkillStore } from "../dist/index.js";
import { ConversationMemoryManager } from "../dist/lib/core/conversationMemoryManager.js";
import { buildContextFromPointer } from "../dist/lib/utils/conversationMemory.js";
import { truncateWithSlidingWindow } from "../dist/lib/context/stages/slidingWindowTruncator.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// ============================================================
// HARNESS
// ============================================================

const providerArg = process.argv
  .find((a) => a.startsWith("--provider="))
  ?.split("=")[1];
const TEST_PROVIDER = providerArg || "vertex";

type ColorName = "green" | "red" | "yellow" | "cyan" | "reset";
const COLORS: Record<ColorName, string> = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

const testResults: Array<{ name: string; result: "PASS" | "FAIL" | "SKIP" }> =
  [];

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP",
  details?: string,
): void {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  const color: ColorName =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(`${icon} ${name}`, color);
  if (details) {
    log(`   ${details}`);
  }
  testResults.push({ name, result: status });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    logTest(name, "PASS");
  } catch (error) {
    logTest(
      name,
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ============================================================
// FIXTURES
// ============================================================

const SEED_SKILLS = [
  {
    id: "skill-refund",
    name: "refund_dispute_escalation",
    displayName: "Refund Dispute Escalation",
    description:
      "How to escalate a disputed refund to the payments on-call team.",
    instructions:
      "1. Collect the transaction id.\n2. Verify the dispute in the dashboard.\n3. Page payments-oncall with severity P2.",
    tags: ["payments", "escalation"],
  },
  {
    id: "skill-deploy",
    name: "service_deployment",
    displayName: "Service Deployment",
    description: "Standard operating procedure for deploying a service.",
    instructions:
      "1. Run the pre-deploy checklist.\n2. Deploy to staging.\n3. Smoke test.\n4. Promote to production.",
    tags: ["devops"],
  },
  {
    id: "skill-channel-only",
    name: "team_alpha_standup",
    description: "Standup format used only by team alpha.",
    instructions: "Post yesterday/today/blockers in the alpha channel thread.",
    tags: ["process"],
    scope: "scoped" as const,
    scopeIds: ["team-alpha"],
  },
];

function makeSkillsInstance(
  overrides: Record<string, unknown> = {},
): NeuroLink {
  return new NeuroLink({
    // Session pinning requires conversation memory (persistence is gated
    // on it) — enable the in-memory manager for activation/session tests.
    conversationMemory: { enabled: true },
    skills: {
      enabled: true,
      storage: { type: "memory", skills: SEED_SKILLS },
      ...overrides,
    },
  });
}

// ============================================================
// TESTS — tool registration
// ============================================================

async function testToolRegistration(): Promise<void> {
  await runTest(
    "1. list_skills registered when enabled; use_skill is per-call only",
    async () => {
      const nl = makeSkillsInstance();
      const tools = nl.getCustomTools();
      assert(tools.has("list_skills"), "list_skills missing");
      assert(
        !tools.has("use_skill"),
        "use_skill must be injected per call, not registered",
      );
      assert(
        !tools.has("read_skill_resource"),
        "read_skill_resource must be injected per call, not registered",
      );
      assert(
        !tools.has("skill_create"),
        "skill_create must be gated off by default",
      );
      assert(
        !tools.has("skill_update"),
        "skill_update must be gated off by default",
      );
      assert(
        !tools.has("skill_delete"),
        "skill_delete must be gated off by default",
      );
    },
  );

  await runTest("2. No skill tools when skills not configured", async () => {
    const nl = new NeuroLink();
    const tools = nl.getCustomTools();
    assert(!tools.has("list_skills"), "list_skills must not be registered");
  });

  await runTest(
    "3. Mutation tools registered with allowMutations",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const tools = nl.getCustomTools();
      assert(tools.has("skill_create"), "skill_create missing");
      assert(tools.has("skill_update"), "skill_update missing");
      assert(tools.has("skill_delete"), "skill_delete missing");
    },
  );
}

// ============================================================
// TESTS — search semantics (manager) + per-call tool injection
// ============================================================

type ToolExecute = (params: unknown, ctx?: unknown) => Promise<unknown>;

function getToolExecute(nl: NeuroLink, name: string): ToolExecute {
  const tool = nl.getCustomTools().get(name);
  assert(tool, `${name} not registered`);
  return tool.execute as ToolExecute;
}

type CallTool = { description: string; execute: ToolExecute };

/**
 * Run the exact per-call augmentation generate()/stream() use (private at
 * the TS level only — dist is plain JS) and return the mutated options.
 */
async function applyAugmentation(
  nl: NeuroLink,
  options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const apply = (
    nl as unknown as {
      applySkillsAugmentation: (o: Record<string, unknown>) => Promise<void>;
    }
  ).applySkillsAugmentation.bind(nl);
  await apply(options);
  return options;
}

function getCallTool(options: Record<string, unknown>, name: string): CallTool {
  const tools = options.tools as Record<string, CallTool> | undefined;
  assert(tools && tools[name], `${name} not injected into options.tools`);
  return tools[name];
}

function drainSkillMessages(
  nl: NeuroLink,
  sessionId: string,
): Array<{
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
}> {
  return (
    nl as unknown as {
      drainPendingSkillMessages: (sid: unknown) => Array<{
        role: string;
        content: string;
        metadata?: Record<string, unknown>;
      }>;
    }
  ).drainPendingSkillMessages.call(nl, sessionId);
}

async function testSearch(): Promise<void> {
  await runTest(
    "4. manager.search hydrates matches with instructions",
    async () => {
      const nl = makeSkillsInstance();
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const matches = await manager.search({ query: "refund" });
      assert(matches.length === 1, `expected 1 match, got ${matches.length}`);
      assert(
        matches[0].name === "refund_dispute_escalation",
        "wrong skill matched",
      );
      assert(
        matches[0].instructions.includes("payments-oncall"),
        "instructions not hydrated",
      );
      const none = await manager.search({ query: "quantum-chromodynamics" });
      assert(none.length === 0, "no-match must return empty");
    },
  );

  await runTest("5. tag filter applies on top of query", async () => {
    const nl = makeSkillsInstance();
    const manager = nl.getSkillsManager();
    assert(manager, "manager missing");
    // "deploy" matches service_deployment; wrong tag excludes it
    const wrongTag = await manager.search({ query: "deploy", tag: "payments" });
    assert(wrongTag.length === 0, "wrong tag must exclude match");
    const rightTag = await manager.search({ query: "deploy", tag: "devops" });
    assert(rightTag.length === 1, "right tag must include match");
  });

  await runTest(
    "6. scoped skills excluded for other scopes, included for own",
    async () => {
      const nl = makeSkillsInstance();
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const foreign = await manager.search({
        query: "standup",
        scopeId: "team-beta",
      });
      assert(foreign.length === 0, "scoped skill leaked into foreign scope");
      const own = await manager.search({
        query: "standup",
        scopeId: "team-alpha",
      });
      assert(
        own.length === 1 && own[0].name === "team_alpha_standup",
        "scoped skill missing in own scope",
      );
    },
  );

  await runTest(
    "6b. #1139: scoped skills fail closed when no scopeId is supplied",
    async () => {
      const nl = makeSkillsInstance();
      const mgr = nl.getSkillsManager()!;
      // No scopeId (and no defaultScopeId): scoped skills must NOT leak.
      const searched = await mgr.search({ query: "standup" });
      assert(
        searched.length === 0,
        "scoped skill leaked to search with no scopeId",
      );
      const listed = await mgr.list();
      assert(
        !listed.some((s) => s.name === "team_alpha_standup"),
        "scoped skill leaked to list with no scopeId",
      );
      // The two global seed skills stay visible without a scopeId.
      assert(
        listed.length === 2,
        `expected 2 global skills, got ${listed.length}`,
      );
    },
  );

  await runTest("7. maxMatches caps hydrated results", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `bulk-${i}`,
      name: `bulk_skill_${i}`,
      description: "A bulk generated skill for capping tests.",
      instructions: `Instructions ${i}`,
    }));
    const nl = new NeuroLink({
      skills: {
        enabled: true,
        storage: { type: "memory", skills: many },
        maxMatches: 3,
      },
    });
    const matches = await nl.getSkillsManager()!.search({ query: "bulk" });
    assert(
      matches.length === 3,
      `expected 3 (maxMatches), got ${matches.length}`,
    );
  });

  await runTest(
    "8. list_skills returns index without instructions",
    async () => {
      const nl = makeSkillsInstance();
      const execute = getToolExecute(nl, "list_skills");
      // Scope supplied so the scoped seed skill is included (fail-closed
      // filtering hides it without a scopeId — #1139).
      const result = (await execute({ scopeId: "team-alpha" })) as {
        success: boolean;
        data: { skills: Array<Record<string, unknown>>; count: number };
      };
      assert(result.success, "expected success");
      assert(
        result.data.count === 3,
        `expected 3 skills, got ${result.data.count}`,
      );
      assert(
        result.data.skills.every((s) => !("instructions" in s)),
        "list_skills must not include instructions",
      );
    },
  );
}

// ============================================================
// TESTS — filesystem store
// ============================================================

async function testFilesystemStore(): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-skills-"));

  // Layout 1: JSON skill
  fs.writeFileSync(
    path.join(dir, "json-skill.json"),
    JSON.stringify({
      id: "json-skill",
      name: "incident_postmortem",
      description: "How to write an incident postmortem.",
      instructions: "Use the 5-whys template and file within 48 hours.",
      tags: ["process"],
    }),
  );
  // Layout 2: frontmatter markdown
  fs.writeFileSync(
    path.join(dir, "oncall_handover.md"),
    [
      "---",
      "name: oncall_handover",
      "description: Checklist for handing over the on-call shift.",
      "tags:",
      "  - devops",
      "  - oncall",
      "---",
      "1. Summarize open incidents.",
      "2. Hand over the pager.",
    ].join("\n"),
  );
  // Layout 3: Claude-skills directory (with a bundled resource)
  fs.mkdirSync(path.join(dir, "release-notes", "references"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(dir, "release-notes", "SKILL.md"),
    [
      "---",
      "name: release_notes",
      "description: How to draft weekly release notes.",
      "---",
      "Collect merged PRs and group by feature area.",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(dir, "release-notes", "references", "template.md"),
    "## Release Notes Template\n- Features\n- Fixes",
  );

  await runTest(
    "11. Filesystem store loads JSON + .md + SKILL.md layouts",
    async () => {
      const nl = new NeuroLink({
        skills: { enabled: true, storage: { type: "filesystem", path: dir } },
      });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const index = await manager.list();
      const names = index.map((i) => i.name).sort();
      assert(
        JSON.stringify(names) ===
          JSON.stringify([
            "incident_postmortem",
            "oncall_handover",
            "release_notes",
          ]),
        `unexpected index: ${names.join(", ")}`,
      );
      const md = await manager.get("oncall_handover");
      assert(
        md?.instructions.includes("Hand over the pager"),
        "markdown body must become instructions",
      );
      assert(
        (md?.tags ?? []).includes("oncall"),
        "frontmatter tags must be parsed",
      );
    },
  );

  await runTest(
    "11b. Filesystem store: SKILL.md siblings become readable resources",
    async () => {
      const nl = new NeuroLink({
        skills: { enabled: true, storage: { type: "filesystem", path: dir } },
      });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const skill = await manager.get("release_notes");
      assert(
        skill?.resources?.some((r) => r.path === "references/template.md"),
        "sibling file not listed as a resource",
      );
      const content = await manager.getResource(
        "release_notes",
        "references/template.md",
      );
      assert(
        content?.includes("Release Notes Template"),
        "resource content not readable",
      );
      const escaped = await manager
        .getResource("release_notes", "../json-skill.json")
        .catch(() => null);
      assert(escaped === null, "path traversal must not escape the skill dir");
    },
  );

  await runTest(
    "12. Filesystem store: malformed file skipped, rest loads",
    async () => {
      fs.writeFileSync(path.join(dir, "broken.json"), "{not json");
      const nl = new NeuroLink({
        skills: {
          enabled: true,
          storage: { type: "filesystem", path: dir },
          indexCacheTtlMs: 0,
        },
      });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const index = await manager.list();
      assert(
        index.length === 3,
        `expected 3 valid skills, got ${index.length}`,
      );
    },
  );

  await runTest(
    "13. Filesystem store: mutation writes JSON and survives reload",
    async () => {
      const nl = new NeuroLink({
        skills: {
          enabled: true,
          storage: { type: "filesystem", path: dir },
          indexCacheTtlMs: 0,
        },
      });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const { skill } = await manager.requestMutation({
        type: "create",
        skill: {
          name: "written_skill",
          description: "Created through the mutation path.",
          instructions: "Persist me.",
        },
      });
      assert(skill, "create returned no skill");
      assert(
        fs.existsSync(path.join(dir, `${skill.id}.json`)),
        "JSON file not written",
      );
      // Fresh instance — reload from disk
      const nl2 = new NeuroLink({
        skills: { enabled: true, storage: { type: "filesystem", path: dir } },
      });
      const reloaded = await nl2.getSkillsManager()?.get("written_skill");
      assert(
        reloaded?.instructions === "Persist me.",
        "skill did not survive reload",
      );
    },
  );
}

// ============================================================
// TESTS — custom store
// ============================================================

async function testCustomStore(): Promise<void> {
  await runTest(
    "14. Custom store plugs in (curator-style adapter)",
    async () => {
      const backing = new Map<string, (typeof SEED_SKILLS)[number]>();
      backing.set(SEED_SKILLS[0].id, SEED_SKILLS[0]);
      const calls: string[] = [];
      const nl = new NeuroLink({
        skills: {
          enabled: true,
          storage: {
            type: "custom",
            store: {
              async get(id: string) {
                calls.push(`get:${id}`);
                return backing.get(id) ?? null;
              },
              async put() {},
              async delete() {},
              async index() {
                calls.push("index");
                return Array.from(backing.values()).map(
                  ({ instructions: _i, ...rest }) => rest,
                );
              },
            },
          },
        },
      });
      const matches = await nl.getSkillsManager()!.search({ query: "refund" });
      assert(matches.length === 1, "custom store match failed");
      assert(calls.includes("index"), "index() not called");
      assert(
        calls.includes("get:skill-refund"),
        "get() not called for hydration",
      );
    },
  );
}

// ============================================================
// TESTS — prompt index
// ============================================================

async function testDiscovery(): Promise<void> {
  await runTest(
    "15. Default discovery: listing rides the use_skill description, prompt untouched",
    async () => {
      const nl = makeSkillsInstance();
      const options = await applyAugmentation(nl, {
        systemPrompt: "You are Tara.",
      });
      assert(
        options.systemPrompt === "You are Tara.",
        "tool-mode discovery must not touch the system prompt",
      );
      const useSkill = getCallTool(options, "use_skill");
      getCallTool(options, "read_skill_resource");
      assert(
        useSkill.description.includes("<available_skills>"),
        "listing block missing from use_skill description",
      );
      assert(
        useSkill.description.includes("refund_dispute_escalation"),
        "skill name missing from listing",
      );
      assert(
        !useSkill.description.includes("payments-oncall"),
        "instructions leaked into the listing",
      );
      // Sorted by name: refund… < service_deployment. The scoped
      // team_alpha_standup is NOT listed without a scopeId (#1139 fail-closed):
      // the default discovery listing must not leak scoped skills.
      const listing = useSkill.description;
      assert(
        listing.indexOf("refund_dispute_escalation") <
          listing.indexOf("service_deployment"),
        "listing must be name-sorted",
      );
      assert(
        !listing.includes("team_alpha_standup"),
        "scoped skill must not appear in the default (no-scopeId) discovery listing",
      );
      // Deterministic: a second augmentation renders byte-identical listing
      const again = await applyAugmentation(nl, { systemPrompt: "x" });
      assert(
        getCallTool(again, "use_skill").description === useSkill.description,
        "listing must be byte-stable across calls",
      );
    },
  );

  await runTest(
    "15b. #1139: promptIndexMaxItems=0 suppresses the system-prompt index",
    async () => {
      const nl = makeSkillsInstance({
        discovery: "system-prompt",
        promptIndexMaxItems: 0,
      });
      const options = await applyAugmentation(nl, {
        systemPrompt: "You are Tara.",
      });
      const prompt = options.systemPrompt as string;
      assert(
        prompt === "You are Tara.",
        "promptIndexMaxItems=0 must not inject the skills index",
      );
      assert(
        !prompt.includes("## Available Skills"),
        "promptIndexMaxItems=0 must suppress the '## Available Skills' block",
      );
    },
  );

  await runTest(
    "16. Discovery modes: system-prompt appends index; skips honored",
    async () => {
      const spNl = makeSkillsInstance({ discovery: "system-prompt" });
      const spOptions = await applyAugmentation(spNl, {
        systemPrompt: "You are Tara.",
      });
      const prompt = spOptions.systemPrompt as string;
      assert(prompt.startsWith("You are Tara."), "base prompt lost");
      assert(prompt.includes("## Available Skills"), "index not appended");
      assert(prompt.includes("use_skill"), "index must reference use_skill");
      const spTool = getCallTool(spOptions, "use_skill");
      assert(
        !spTool.description.includes("<available_skills>"),
        "system-prompt mode must not duplicate the listing in the tool",
      );

      const nl = makeSkillsInstance();
      // Per-call disable
      const disabled = await applyAugmentation(nl, {
        systemPrompt: "base",
        skills: { enabled: false },
      });
      assert(disabled.systemPrompt === "base", "per-call disable ignored");
      assert(!disabled.tools, "disabled call must not receive skill tools");

      // Media-only mode skipped
      const media = await applyAugmentation(nl, {
        systemPrompt: "base",
        output: { mode: "video" },
      });
      assert(media.systemPrompt === "base", "media mode must skip injection");
      assert(!media.tools, "media mode must not receive skill tools");

      // Scope filter narrows the listing
      const scoped = await applyAugmentation(nl, {
        systemPrompt: "",
        skills: { scopeId: "team-beta" },
      });
      assert(
        !getCallTool(scoped, "use_skill").description.includes(
          "team_alpha_standup",
        ),
        "foreign-scope skill leaked into the listing",
      );
    },
  );

  await runTest(
    "17. Listing budget shortens descriptions, never drops names",
    async () => {
      const longSkills = Array.from({ length: 6 }, (_, i) => ({
        id: `long-${i}`,
        name: `long_skill_${i}`,
        description:
          `Primary sentence for skill ${i}. ` +
          "Second sentence with a lot of extra detail that should be the first thing dropped when the listing exceeds its character budget.".repeat(
            3,
          ),
        instructions: "Body.",
      }));
      // Tight enough that every description must shrink to its first
      // sentence (shortening stops as soon as the listing fits).
      const nl = new NeuroLink({
        skills: {
          enabled: true,
          storage: { type: "memory", skills: longSkills },
          listingBudgetChars: 400,
        },
      });
      const options = await applyAugmentation(nl, { systemPrompt: "" });
      const listing = getCallTool(options, "use_skill").description;
      for (let i = 0; i < 6; i++) {
        assert(
          listing.includes(`long_skill_${i}`),
          `name long_skill_${i} dropped from budgeted listing`,
        );
      }
      assert(
        !listing.includes("Second sentence"),
        "descriptions must be shortened under budget pressure",
      );
    },
  );
}

// ============================================================
// TESTS — activation + session pinning
// ============================================================

async function testActivation(): Promise<void> {
  await runTest(
    "34. use_skill loads full instructions once, then already_loaded",
    async () => {
      const nl = makeSkillsInstance();
      const sessionId = "sess-activation";
      const options = await applyAugmentation(nl, {
        systemPrompt: "",
        context: { sessionId },
      });
      const useSkill = getCallTool(options, "use_skill");
      const first = (await useSkill.execute({
        name: "refund_dispute_escalation",
      })) as {
        success: boolean;
        data: { instructions?: string; status?: string };
      };
      assert(first.success, "activation failed");
      assert(
        first.data.instructions?.includes("payments-oncall"),
        "full instructions missing from activation",
      );
      const second = (await useSkill.execute({
        name: "refund_dispute_escalation",
      })) as { data: { status?: string; instructions?: string } };
      assert(
        second.data.status === "already_loaded",
        "second activation must dedupe",
      );
      assert(
        !second.data.instructions,
        "already_loaded must not resend the body",
      );

      const unknown = (await useSkill.execute({ name: "nope" })) as {
        success: boolean;
        error?: string;
      };
      assert(
        !unknown.success && (unknown.error ?? "").includes("nope"),
        "unknown skill must return an error envelope",
      );
    },
  );

  await runTest(
    "34b. #1139: use_skill fails closed on a scoped skill without a scopeId",
    async () => {
      const nl = makeSkillsInstance();
      // No scopeId supplied: the scoped seed skill must be invisible by name,
      // closing the per-call activation bypass (isSkillVisibleInScope).
      const noScope = await applyAugmentation(nl, { systemPrompt: "" });
      const blocked = (await getCallTool(noScope, "use_skill").execute({
        name: "team_alpha_standup",
      })) as { success: boolean; error?: string };
      assert(
        !blocked.success &&
          (blocked.error ?? "").includes("team_alpha_standup"),
        "scoped skill must not activate by name without a scopeId",
      );

      // The tenant's own scopeId makes exactly that scoped skill activatable.
      const inScope = await applyAugmentation(nl, {
        systemPrompt: "",
        context: { sessionId: "sess-scope-alpha" },
        skills: { scopeId: "team-alpha" },
      });
      const allowed = (await getCallTool(inScope, "use_skill").execute({
        name: "team_alpha_standup",
      })) as { success: boolean; data?: { instructions?: string } };
      assert(
        allowed.success &&
          (allowed.data?.instructions ?? "").includes("alpha channel"),
        "scoped skill must activate for its own scopeId",
      );
    },
  );

  await runTest(
    "34c. #1139: read_skill_resource fails closed on a scoped skill without a scopeId",
    async () => {
      const nl = makeSkillsInstance();
      const noScope = await applyAugmentation(nl, { systemPrompt: "" });
      const blocked = (await getCallTool(
        noScope,
        "read_skill_resource",
      ).execute({
        skill: "team_alpha_standup",
        path: "references/anything.md",
      })) as { success: boolean; error?: string };
      assert(
        !blocked.success &&
          (blocked.error ?? "").includes("team_alpha_standup"),
        "scoped skill resources must not be readable without a scopeId",
      );
    },
  );

  await runTest(
    "35. Activation pins a history message; drain is one-shot",
    async () => {
      const nl = makeSkillsInstance();
      const sessionId = "sess-pin";
      const options = await applyAugmentation(nl, {
        systemPrompt: "",
        context: { sessionId },
      });
      await getCallTool(options, "use_skill").execute({
        name: "service_deployment",
      });
      const pinned = drainSkillMessages(nl, sessionId);
      assert(
        pinned.length === 1,
        `expected 1 pinned message, got ${pinned.length}`,
      );
      assert(pinned[0].role === "user", "pinned message must be user-role");
      assert(
        pinned[0].content.includes("[Skill loaded: service_deployment v1]"),
        "pinned header missing",
      );
      assert(
        pinned[0].content.includes("pre-deploy checklist"),
        "pinned body missing",
      );
      assert(
        pinned[0].metadata?.isSkill === true,
        "metadata.isSkill missing on pinned message",
      );
      assert(
        drainSkillMessages(nl, sessionId).length === 0,
        "drain must be one-shot",
      );
    },
  );

  await runTest(
    "36. Memory manager stores pinned skills between ask and answer",
    async () => {
      const memory = new ConversationMemoryManager({});
      await memory.storeConversationTurn({
        sessionId: "s1",
        userMessage: "how do I deploy?",
        aiResponse: "Loaded the SOP and followed it.",
        skillMessages: [
          {
            id: "skill-msg-1",
            role: "user",
            content: "[Skill loaded: service_deployment v1]\n\nBody.",
            metadata: {
              isSkill: true,
              skillId: "skill-deploy",
              skillName: "service_deployment",
              skillVersion: 1,
            },
          },
        ],
      });
      const messages = await memory.getSessionMessages("s1");
      assert(
        messages.length === 3,
        `expected 3 messages, got ${messages.length}`,
      );
      assert(
        messages[0].role === "user" &&
          messages[1].metadata?.isSkill === true &&
          messages[2].role === "assistant",
        "order must be ask → skill → answer",
      );
    },
  );

  await runTest("37. Pinned skills survive summarization replay", async () => {
    const session = {
      sessionId: "s2",
      messages: [
        { id: "m1", role: "user", content: "old ask" },
        {
          id: "m-skill",
          role: "user",
          content: "[Skill loaded: x v1]\n\nBody.",
          metadata: { isSkill: true, skillId: "x", skillName: "x" },
        },
        { id: "m2", role: "assistant", content: "old answer" },
        { id: "m3", role: "user", content: "recent ask" },
        { id: "m4", role: "assistant", content: "recent answer" },
      ],
      createdAt: 0,
      lastActivity: 0,
      summarizedUpToMessageId: "m2",
      summarizedMessage: "Earlier the user asked and got an answer.",
    };
    const context = buildContextFromPointer(session as never);
    assert(context[0]?.metadata?.isSummary === true, "summary must lead");
    assert(
      context[1]?.metadata?.isSkill === true,
      "pinned skill must be re-included right after the summary",
    );
    assert(
      context.some((m: { id: string }) => m.id === "m3"),
      "recent messages must remain",
    );
  });

  await runTest(
    "38. Pinned skills survive sliding-window truncation",
    async () => {
      const filler = (i: number, role: "user" | "assistant") => ({
        id: `f${i}`,
        role,
        content: `filler ${i} `.repeat(50),
      });
      const messages = [
        filler(0, "user"),
        filler(1, "assistant"),
        {
          id: "m-skill",
          role: "user",
          content: "[Skill loaded: x v1]\n\nBody.",
          metadata: { isSkill: true },
        },
        ...Array.from({ length: 20 }, (_, i) =>
          filler(i + 2, i % 2 === 0 ? "user" : "assistant"),
        ),
      ];
      const result = truncateWithSlidingWindow(
        messages as never,
        {
          fraction: 0.9,
        } as never,
      );
      assert(result.truncated, "expected truncation to trigger");
      assert(
        result.messages.some((m: { id: string }) => m.id === "m-skill"),
        "pinned skill dropped by sliding-window truncation",
      );
    },
  );

  await runTest(
    "39. Resources: listed on activation, gated + path-safe reads",
    async () => {
      const nl = new NeuroLink({
        conversationMemory: { enabled: true },
        skills: {
          enabled: true,
          storage: {
            type: "memory",
            skills: [SEED_SKILLS[0]],
            resources: {
              "skill-refund": {
                "references/edge-cases.md": "Edge case: partial refunds.",
              },
            },
          },
        },
      });
      const sessionId = "sess-res";
      const options = await applyAugmentation(nl, {
        systemPrompt: "",
        context: { sessionId },
      });
      const readTool = getCallTool(options, "read_skill_resource");

      const early = (await readTool.execute({
        skill: "refund_dispute_escalation",
        path: "references/edge-cases.md",
      })) as { success: boolean; error?: string };
      assert(
        !early.success && (early.error ?? "").includes("use_skill"),
        "resource read must be gated on activation",
      );

      const activated = (await getCallTool(options, "use_skill").execute({
        name: "refund_dispute_escalation",
      })) as { data: { resources?: string[] } };
      assert(
        activated.data.resources?.includes("references/edge-cases.md"),
        "resources not listed on activation",
      );

      const read = (await readTool.execute({
        skill: "refund_dispute_escalation",
        path: "references/edge-cases.md",
      })) as { success: boolean; data?: { content: string } };
      assert(
        read.success && read.data?.content.includes("partial refunds"),
        "resource content not returned",
      );

      const traversal = (await readTool.execute({
        skill: "refund_dispute_escalation",
        path: "../secrets.txt",
      })) as { success: boolean };
      assert(!traversal.success, "traversal path must be rejected");
    },
  );

  await runTest(
    "40. Preload activates up front and never double-pins",
    async () => {
      const nl = makeSkillsInstance();
      const sessionId = "sess-preload";
      const options = await applyAugmentation(nl, {
        systemPrompt: "base",
        context: { sessionId },
        skills: { preload: ["service_deployment"] },
      });
      const prompt = options.systemPrompt as string;
      assert(
        prompt.includes("[Skill loaded: service_deployment v1]") &&
          prompt.includes("pre-deploy checklist"),
        "preload must inject instructions into the call prompt",
      );
      // Second call in the same turn window (pin still pending): must not
      // re-inject or re-pin.
      const second = await applyAugmentation(nl, {
        systemPrompt: "base",
        context: { sessionId },
        skills: { preload: ["service_deployment"] },
      });
      assert(
        second.systemPrompt === "base",
        "already-active preload must not re-inject",
      );
      assert(
        drainSkillMessages(nl, sessionId).length === 1,
        "exactly one pin must exist across both preloads",
      );
      // The pin was drained but never stored (failed persistence): the
      // tracker derives state from history, so preload self-heals by
      // re-activating instead of pointing at instructions that exist
      // nowhere.
      const third = await applyAugmentation(nl, {
        systemPrompt: "base",
        context: { sessionId },
        skills: { preload: ["service_deployment"] },
      });
      assert(
        (third.systemPrompt as string).includes("pre-deploy checklist"),
        "unpersisted activation must re-activate, not stay falsely loaded",
      );
    },
  );

  await runTest(
    "41. Session pins the activated version across updates",
    async () => {
      const nl = makeSkillsInstance();
      const sessionId = "sess-version";
      const options = await applyAugmentation(nl, {
        systemPrompt: "",
        context: { sessionId },
      });
      await getCallTool(options, "use_skill").execute({
        name: "service_deployment",
      });
      await nl.getSkillsManager()!.requestMutation({
        type: "update",
        skillId: "skill-deploy",
        patch: { instructions: "Completely new steps." },
      });
      const again = (await getCallTool(options, "use_skill").execute({
        name: "service_deployment",
      })) as { data: { status?: string; version?: number } };
      assert(
        again.data.status === "already_loaded",
        "updated skill must stay pinned in-session",
      );
      assert(
        again.data.version === 1,
        `session must keep the activated v1, got v${again.data.version}`,
      );
    },
  );
}

// ============================================================
// TESTS — mutations
// ============================================================

async function testMutations(): Promise<void> {
  await runTest(
    "18. skill_create applies directly without a hook",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const execute = getToolExecute(nl, "skill_create");
      const result = (await execute({
        name: "new_skill",
        description: "A new skill.",
        instructions: "Do the new thing.",
      })) as { success: boolean; data?: { status: string; skillId?: string } };
      assert(result.success, "create failed");
      assert(result.data?.status === "applied", "expected applied");
      const found = await nl.getSkillsManager()?.get("new_skill");
      assert(found?.instructions === "Do the new thing.", "skill not stored");
    },
  );

  await runTest("19. onMutationRequest reject blocks the write", async () => {
    const nl = makeSkillsInstance({
      allowMutations: true,
      onMutationRequest: async () => ({
        outcome: "rejected" as const,
        reason: "needs approver",
      }),
    });
    const execute = getToolExecute(nl, "skill_create");
    const result = (await execute({
      name: "blocked_skill",
      description: "Should never be written.",
      instructions: "Nope.",
    })) as { success: boolean; error?: string };
    assert(!result.success, "rejected mutation must fail");
    assert(
      (result.error ?? "").includes("needs approver"),
      "reject reason not surfaced",
    );
    const found = await nl.getSkillsManager()?.get("blocked_skill");
    assert(!found, "rejected skill must not be stored");
  });

  await runTest(
    "20. onMutationRequest pending defers the write (maker-checker)",
    async () => {
      const pendingActions: unknown[] = [];
      const nl = makeSkillsInstance({
        allowMutations: true,
        onMutationRequest: async (action: unknown) => {
          pendingActions.push(action);
          return { outcome: "pending" as const, reference: "APPROVAL-42" };
        },
      });
      const execute = getToolExecute(nl, "skill_create");
      const result = (await execute({
        name: "pending_skill",
        description: "Waits for approval.",
        instructions: "Later.",
      })) as {
        success: boolean;
        data?: { status: string; reference?: string };
      };
      assert(result.success, "pending must be success");
      assert(
        result.data?.status === "pending_approval",
        "expected pending_approval",
      );
      assert(
        result.data?.reference === "APPROVAL-42",
        "reference not surfaced",
      );
      assert(pendingActions.length === 1, "hook not invoked");
      const found = await nl.getSkillsManager()?.get("pending_skill");
      assert(!found, "pending skill must not be stored yet");
    },
  );

  await runTest("21. skill_update bumps version, patch merges", async () => {
    const nl = makeSkillsInstance({ allowMutations: true });
    const execute = getToolExecute(nl, "skill_update");
    const result = (await execute({
      skillId: "skill-deploy",
      description: "Updated SOP for deploying a service.",
    })) as { success: boolean; data?: { version?: number } };
    assert(result.success, "update failed");
    assert(
      result.data?.version === 2,
      `expected version 2, got ${result.data?.version}`,
    );
    const updated = await nl.getSkillsManager()?.get("skill-deploy");
    assert(
      updated?.description === "Updated SOP for deploying a service.",
      "patch not applied",
    );
    assert(
      updated?.instructions.includes("pre-deploy checklist"),
      "unpatched field lost",
    );
  });

  await runTest(
    "22. skill_delete soft-deletes; skill drops from search/list",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const del = getToolExecute(nl, "skill_delete");
      const result = (await del({ skillId: "skill-refund" })) as {
        success: boolean;
      };
      assert(result.success, "delete failed");
      const after = await nl.getSkillsManager()!.search({ query: "refund" });
      assert(after.length === 0, "deprecated skill still matches");
      const list = getToolExecute(nl, "list_skills");
      // Scope supplied so the scoped seed skill stays visible (fail-closed
      // filtering hides it without a scopeId — #1139); refund must be gone.
      const listed = (await list({ scopeId: "team-alpha" })) as {
        data: { count: number };
      };
      assert(listed.data.count === 2, "deprecated skill still listed");
    },
  );

  await runTest(
    "22c. reusing a soft-deleted skill's name is rejected (integrity)",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const del = getToolExecute(nl, "skill_delete");
      const create = getToolExecute(nl, "skill_create");
      // Soft-delete skill-refund, then try to reuse its name. #1139 closed this
      // off: a deprecated skill keeps its name reserved, because allowing the
      // reuse left two index entries sharing one name and every name-based
      // lookup then had to guess which was meant.
      await del({ skillId: "skill-refund" });
      const created = (await create({
        name: "REFUND_dispute_escalation",
        description: "Fresh active version of the refund SOP.",
        instructions: "NEW refund handling instructions.",
      })) as { success: boolean; error?: string };
      assert(
        !created.success,
        "reusing a soft-deleted skill's name must be rejected",
      );
      assert(
        (created.error ?? "").includes("deprecated"),
        "the error should explain that the name belongs to a deprecated skill",
      );
    },
  );

  await runTest(
    "22d. get() prefers the active entry when a legacy duplicate-name pair exists",
    async () => {
      // The collision can no longer be created through the API, but stores
      // written before #1139 can still hold the pair, so get()'s active-first
      // resolution remains load-bearing. Seeded directly to represent that
      // legacy data rather than through the (now-blocking) mutation path.
      const nl = makeSkillsInstance({
        storage: {
          type: "memory",
          skills: [
            {
              id: "legacy-stale",
              name: "duplicated_name",
              description: "Stale deprecated entry.",
              instructions: "OLD instructions.",
              status: "deprecated",
            },
            {
              id: "legacy-active",
              name: "duplicated_name",
              description: "Active entry sharing the name.",
              instructions: "NEW instructions.",
              status: "active",
            },
          ],
        },
      });
      const resolved = await nl.getSkillsManager()?.get("duplicated_name");
      assert(
        resolved?.id === "legacy-active" &&
          resolved?.instructions === "NEW instructions.",
        `get(name) must resolve the active entry, got id=${resolved?.id}`,
      );
    },
  );

  await runTest(
    "22e. get() by name is case-insensitive, matching the uniqueness rule",
    async () => {
      // assertNameAvailable compares lowercased, so "REFUND_dispute_escalation"
      // and "refund_dispute_escalation" cannot coexist. A case-sensitive
      // lookup could therefore only ever fail to find a skill that is present.
      const manager = makeSkillsInstance().getSkillsManager();
      assert(manager, "manager missing");
      const upper = await manager.get("REFUND_DISPUTE_ESCALATION");
      assert(
        upper?.id === "skill-refund",
        `differently-cased name must resolve, got id=${upper?.id}`,
      );
    },
  );

  await runTest("23. Duplicate active name rejected on create", async () => {
    const nl = makeSkillsInstance({ allowMutations: true });
    const execute = getToolExecute(nl, "skill_create");
    const result = (await execute({
      name: "REFUND_dispute_escalation",
      description: "Case-insensitive clash.",
      instructions: "Should clash.",
    })) as { success: boolean; error?: string };
    assert(!result.success, "duplicate name must be rejected");
    assert(
      (result.error ?? "").includes("already exists"),
      "clash error not surfaced",
    );
  });

  await runTest(
    "23b. Case-only rename does not self-clash; scoped update without scopeIds rejected",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");

      // Case-only rename of the same skill must be allowed (no self-clash).
      const renamed = await manager.requestMutation({
        type: "update",
        skillId: "skill-deploy",
        patch: { name: "Service_Deployment" },
      });
      assert(
        renamed.skill?.name === "Service_Deployment",
        "case-only rename was blocked by self-clash",
      );

      // Update that flips scope to "scoped" without scopeIds must be rejected
      // post-merge (would create an unmatchable skill).
      let rejected = false;
      try {
        await manager.requestMutation({
          type: "update",
          skillId: "skill-refund",
          patch: { scope: "scoped" },
        });
      } catch (error) {
        rejected = (error as Error).message.includes("scopeIds");
      }
      assert(rejected, "scoped-without-scopeIds update must be rejected");

      // Same guard on create through the manager (covers server POST path).
      let createRejected = false;
      try {
        await manager.requestMutation({
          type: "create",
          skill: {
            name: "unmatchable_skill",
            description: "Scoped with no scope ids.",
            instructions: "Never matchable.",
            scope: "scoped",
          },
        });
      } catch (error) {
        createRejected = (error as Error).message.includes("scopeIds");
      }
      assert(createRejected, "scoped-without-scopeIds create must be rejected");
    },
  );

  await runTest(
    "23c. Concurrent same-name creates are serialized (single winner)",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const attempts = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) =>
          manager.requestMutation({
            type: "create",
            skill: {
              name: "raced_skill",
              description: `Racer ${i}.`,
              instructions: "First one wins.",
            },
          }),
        ),
      );
      const winners = attempts.filter((a) => a.status === "fulfilled");
      assert(
        winners.length === 1,
        `expected exactly 1 winner, got ${winners.length}`,
      );
      const index = await manager.list();
      const copies = index.filter((s) => s.name === "raced_skill");
      assert(
        copies.length === 1,
        `expected 1 stored copy, got ${copies.length}`,
      );
    },
  );
}

// ============================================================
// TESTS — S3 store (hermetic via injected object ops)
// ============================================================

function makeStubS3(seed?: Record<string, string>) {
  const objects = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    objects,
    ops: {
      async getObject(key: string) {
        return objects.get(key) ?? null;
      },
      async putObject(key: string, body: string) {
        objects.set(key, body);
      },
      async deleteObject(key: string) {
        objects.delete(key);
      },
      async listKeys(prefix: string) {
        return [...objects.keys()].filter((k) => k.startsWith(prefix));
      },
    },
  };
}

async function testS3Store(): Promise<void> {
  await runTest(
    "25. S3 store: put/get/delete + index.json upsert",
    async () => {
      const stub = makeStubS3();
      const store = new S3SkillStore(
        { type: "s3", bucket: "test-bucket", prefix: "tara/" },
        stub.ops,
      );
      await store.put(SEED_SKILLS[0]);
      await store.put(SEED_SKILLS[1]);

      assert(
        stub.objects.has("tara/skills/skill-refund.json"),
        "skill object not written under prefix",
      );
      const index = JSON.parse(stub.objects.get("tara/index.json") ?? "{}");
      assert(index.skills?.length === 2, "index.json not upserted");
      assert(
        index.skills.every(
          (s: Record<string, unknown>) => !("instructions" in s),
        ),
        "index.json must not contain instructions",
      );

      const fetched = await store.get("skill-refund");
      assert(
        fetched?.instructions.includes("payments-oncall"),
        "get() did not round-trip",
      );

      await store.delete("skill-refund");
      assert(
        !stub.objects.has("tara/skills/skill-refund.json"),
        "delete() left the object",
      );
      const afterDelete = await store.index();
      assert(afterDelete.length === 1, "index not updated after delete");
    },
  );

  await runTest(
    "26. S3 store: corrupt index.json self-heals from listing",
    async () => {
      const stub = makeStubS3({
        "tara/index.json": "{corrupt",
        "tara/skills/skill-a.json": JSON.stringify(SEED_SKILLS[0]),
        "tara/skills/skill-b.json": JSON.stringify(SEED_SKILLS[1]),
        "tara/skills/garbage.json": "not-json",
      });
      const store = new S3SkillStore(
        { type: "s3", bucket: "test-bucket", prefix: "tara/" },
        stub.ops,
      );
      const index = await store.index();
      assert(
        index.length === 2,
        `rebuild expected 2 skills, got ${index.length}`,
      );
      const persisted = JSON.parse(stub.objects.get("tara/index.json") ?? "{}");
      assert(
        persisted.skills?.length === 2,
        "rebuilt index.json not persisted back",
      );
    },
  );

  await runTest(
    "27. S3 via factory with unusable SDK/config fails openly",
    async () => {
      // Depending on the runner, @aws-sdk/client-s3 is either not resolvable
      // (error tells the user to install it) or resolvable but unconfigured
      // (e.g. "Region is missing"). Either way the contract is the same:
      // the tool returns a success:false envelope with a real error message
      // and never throws into the generate/stream path.
      const nl = new NeuroLink({
        skills: {
          enabled: true,
          storage: { type: "s3", bucket: "no-sdk-installed" },
        },
      });
      const execute = getToolExecute(nl, "list_skills");
      const result = (await execute({})) as {
        success: boolean;
        error?: string;
      };
      assert(!result.success, "expected tool-level error envelope");
      assert(
        (result.error ?? "").length > 0,
        "error message must be surfaced to the model",
      );
    },
  );

  await runTest(
    "27b. S3 store: resources by key + ETag-conditional index refresh",
    async () => {
      const stub = makeStubS3({
        "tara/skills/skill-refund/references/edge-cases.md":
          "Edge case: partial refunds.",
      });
      // Conditional-read seam: serve ETags and count full downloads.
      let fullReads = 0;
      let etagVersion = 0;
      const conditionalOps = {
        ...stub.ops,
        async putObject(key: string, body: string) {
          if (key === "tara/index.json") {
            etagVersion++;
          }
          await stub.ops.putObject(key, body);
        },
        async getObjectConditional(key: string, etag?: string) {
          const current = `"v${etagVersion}"`;
          if (etag && etag === current) {
            return { body: null, notModified: true };
          }
          fullReads++;
          return { body: stub.objects.get(key) ?? null, etag: current };
        },
      };
      const store = new S3SkillStore(
        { type: "s3", bucket: "test-bucket", prefix: "tara/" },
        conditionalOps,
      );
      await store.put(SEED_SKILLS[0]);

      const resource = await store.getResource(
        "skill-refund",
        "references/edge-cases.md",
      );
      assert(
        resource === "Edge case: partial refunds.",
        "resource not readable by key",
      );

      const baseline = fullReads;
      await store.index(); // revalidates: post-write etag unknown → 1 full read
      const afterFirst = fullReads;
      assert(afterFirst > baseline, "first index read must download");
      await store.index(); // unchanged → 304, no new download
      assert(
        fullReads === afterFirst,
        "unchanged index must be served from the 304 path",
      );

      await store.put(SEED_SKILLS[1]); // index rewritten → etag changes
      const index = await store.index();
      assert(index.length === 2, "index must reflect the new write");
    },
  );
}

// ============================================================
// TESTS — Redis store (SKIPs when Redis is unreachable)
// ============================================================

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function testRedisStore(): Promise<void> {
  const name = "28. Redis store: round-trip + index via SCAN";
  const keyPrefix = `neurolink:test:skills:${Date.now().toString(36)}:`;
  const store = new RedisSkillStore({ type: "redis", keyPrefix });
  try {
    await withDeadline(store.put(SEED_SKILLS[0]), 5000);
  } catch (error) {
    logTest(
      name,
      "SKIP",
      `Redis unreachable: ${error instanceof Error ? error.message.slice(0, 100) : error}`,
    );
    return;
  }

  try {
    await store.put(SEED_SKILLS[1]);
    const fetched = await store.get("skill-refund");
    assert(
      fetched?.instructions.includes("payments-oncall"),
      "get() did not round-trip",
    );
    const index = await store.index();
    assert(index.length === 2, `index expected 2, got ${index.length}`);
    assert(
      index.every((s) => !("instructions" in s)),
      "index must strip instructions",
    );

    // Full path through NeuroLink config + manager search
    const nl = new NeuroLink({
      skills: {
        enabled: true,
        storage: { type: "redis", keyPrefix },
        indexCacheTtlMs: 0,
      },
    });
    const matches = await nl.getSkillsManager()!.search({ query: "refund" });
    assert(
      matches[0]?.name === "refund_dispute_escalation",
      "search through redis store failed",
    );

    await store.delete("skill-refund");
    await store.delete("skill-deploy");
    const after = await store.index();
    assert(after.length === 0, "cleanup delete failed");
    logTest(name, "PASS");
  } catch (error) {
    logTest(
      name,
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ============================================================
// TESTS — CLI (spawns the built CLI against a temp skills dir)
// ============================================================

function runCli(
  args: string[],
  timeoutMs = 60_000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(REPO_ROOT, "dist", "cli", "index.js"), ...args],
      { cwd: REPO_ROOT, env: { ...process.env, NO_COLOR: "1" } },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`CLI timed out: ${args.join(" ")}`));
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function extractJson(stdout: string): unknown {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  assert(
    start >= 0 && end > start,
    `no JSON found in output: ${stdout.slice(0, 200)}`,
  );
  return JSON.parse(stdout.slice(start, end + 1));
}

async function testCli(): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-skills-cli-"));

  await runTest(
    "29. CLI: skills create → list → show → search → delete",
    async () => {
      const create = await runCli([
        "skills",
        "create",
        "--skills-dir",
        dir,
        "--name",
        "cli_test_skill",
        "--description",
        "A skill created from the CLI test suite.",
        "--instructions",
        "Step 1: exist. Step 2: be found.",
        "--tags",
        "testing",
      ]);
      assert(
        create.code === 0,
        `create exited ${create.code}: ${create.stderr.slice(0, 200)}`,
      );

      const list = await runCli([
        "skills",
        "list",
        "--skills-dir",
        dir,
        "--format",
        "json",
      ]);
      assert(list.code === 0, `list exited ${list.code}`);
      const listed = extractJson(list.stdout) as {
        skills: Array<{ name: string }>;
        count: number;
      };
      assert(listed.count === 1, `expected 1 skill, got ${listed.count}`);
      assert(listed.skills[0].name === "cli_test_skill", "wrong skill listed");

      const show = await runCli([
        "skills",
        "show",
        "cli_test_skill",
        "--skills-dir",
        dir,
      ]);
      assert(show.code === 0, `show exited ${show.code}`);
      assert(
        show.stdout.includes("Step 2: be found."),
        "show must print full instructions",
      );

      const search = await runCli([
        "skills",
        "search",
        "created from the CLI",
        "--skills-dir",
        dir,
        "--format",
        "json",
      ]);
      const found = extractJson(search.stdout) as { count: number };
      assert(found.count === 1, "search did not match");

      const del = await runCli([
        "skills",
        "delete",
        "cli_test_skill",
        "--skills-dir",
        dir,
      ]);
      assert(del.code === 0, `delete exited ${del.code}`);

      const after = await runCli([
        "skills",
        "list",
        "--skills-dir",
        dir,
        "--format",
        "json",
      ]);
      const remaining = extractJson(after.stdout) as { count: number };
      assert(remaining.count === 0, "deleted skill still listed");
    },
  );

  await runTest("30. CLI: generate --help documents --skills-dir", async () => {
    const help = await runCli(["generate", "--help"]);
    assert(help.code === 0, `help exited ${help.code}`);
    assert(
      help.stdout.includes("skills-dir"),
      "--skills-dir missing from generate --help",
    );
  });
}

// ============================================================
// TESTS — server routes (handler-level, no HTTP transport)
// ============================================================

type RouteHandler = (ctx: Record<string, unknown>) => Promise<unknown>;

async function loadSkillsRoutes(): Promise<Map<string, RouteHandler>> {
  const serverModule = (await import("../dist/server/index.js")) as {
    createAgentRoutes: (basePath?: string) => {
      routes: Array<{ method: string; path: string; handler: RouteHandler }>;
    };
  };
  const group = serverModule.createAgentRoutes("/api");
  const handlers = new Map<string, RouteHandler>();
  for (const route of group.routes) {
    if (route.path.includes("/agent/skills")) {
      handlers.set(`${route.method} ${route.path}`, route.handler);
    }
  }
  return handlers;
}

function makeServerCtx(
  nl: NeuroLink,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    requestId: "test-req",
    method: "GET",
    path: "/api/agent/skills",
    headers: {},
    query: {},
    params: {},
    neurolink: nl,
    toolRegistry: {},
    timestamp: Date.now(),
    metadata: {},
    ...overrides,
  };
}

async function testServerRoutes(): Promise<void> {
  await runTest(
    "31. Server: skills routes registered (5 endpoints)",
    async () => {
      const handlers = await loadSkillsRoutes();
      for (const key of [
        "GET /api/agent/skills",
        "GET /api/agent/skills/:id",
        "POST /api/agent/skills",
        "PATCH /api/agent/skills/:id",
        "DELETE /api/agent/skills/:id",
      ]) {
        assert(handlers.has(key), `missing route: ${key}`);
      }
    },
  );

  await runTest(
    "32. Server: list → create → get → patch → delete flow",
    async () => {
      const handlers = await loadSkillsRoutes();
      const nl = makeSkillsInstance({ allowMutations: true });

      const listed = (await handlers.get("GET /api/agent/skills")!(
        makeServerCtx(nl, { query: { scopeId: "team-alpha" } }),
      )) as { skills: unknown[]; count: number };
      assert(listed.count === 3, `expected 3 skills, got ${listed.count}`);

      const created = (await handlers.get("POST /api/agent/skills")!(
        makeServerCtx(nl, {
          method: "POST",
          body: {
            name: "http_created_skill",
            description: "Created over the skills API.",
            instructions: "Serve requests.",
          },
        }),
      )) as { decision?: { outcome: string }; skill?: { id: string } };
      assert(created.decision?.outcome === "approved", "create not applied");
      assert(created.skill?.id, "created skill id missing");

      const fetched = (await handlers.get("GET /api/agent/skills/:id")!(
        makeServerCtx(nl, { params: { id: "http_created_skill" } }),
      )) as { instructions?: string };
      assert(
        fetched.instructions === "Serve requests.",
        "GET :id did not return instructions",
      );

      const patched = (await handlers.get("PATCH /api/agent/skills/:id")!(
        makeServerCtx(nl, {
          method: "PATCH",
          params: { id: "http_created_skill" },
          body: { description: "Updated over the skills API." },
        }),
      )) as { skill?: { version?: number } };
      assert(patched.skill?.version === 2, "PATCH did not bump version");

      const deleted = (await handlers.get("DELETE /api/agent/skills/:id")!(
        makeServerCtx(nl, {
          method: "DELETE",
          params: { id: "http_created_skill" },
        }),
      )) as { skill?: { status?: string } };
      assert(
        deleted.skill?.status === "deprecated",
        "DELETE did not deprecate",
      );

      const missing = (await handlers.get("GET /api/agent/skills/:id")!(
        makeServerCtx(nl, { params: { id: "does-not-exist" } }),
      )) as { error?: { code: string } };
      assert(missing.error?.code === "NOT_FOUND", "missing skill must 404");
    },
  );

  await runTest(
    "32b. Server: mutation routes rejected when allowMutations is false",
    async () => {
      const handlers = await loadSkillsRoutes();
      const nl = makeSkillsInstance(); // allowMutations defaults to false
      const blocked = (await handlers.get("POST /api/agent/skills")!(
        makeServerCtx(nl, {
          method: "POST",
          body: {
            name: "blocked_skill",
            description: "Should never be created over the API.",
            instructions: "Blocked.",
          },
        }),
      )) as { error?: { code: string } };
      assert(
        blocked.error?.code === "SKILLS_MUTATIONS_DISABLED",
        "create must be rejected when allowMutations is false",
      );
      const listed = (await handlers.get("GET /api/agent/skills")!(
        makeServerCtx(nl, { query: { scopeId: "team-alpha" } }),
      )) as { count: number };
      assert(listed.count === 3, "blocked create must not have persisted");
    },
  );

  await runTest(
    "33. Server: 503 envelope when skills not configured",
    async () => {
      const handlers = await loadSkillsRoutes();
      const nl = new NeuroLink();
      const result = (await handlers.get("GET /api/agent/skills")!(
        makeServerCtx(nl),
      )) as { error?: { code: string } };
      assert(
        result.error?.code === "SKILLS_UNAVAILABLE",
        "expected SKILLS_UNAVAILABLE",
      );
    },
  );
}

// ============================================================
// TESTS — live generate (requires provider credentials)
// ============================================================

async function testLiveGenerate(): Promise<void> {
  const LIVE_NAME = "24. Live: model calls use_skill and follows it";
  const liveEnabled = process.env.SKILLS_SUITE_LIVE !== "false";
  if (!liveEnabled) {
    logTest(LIVE_NAME, "SKIP", "SKILLS_SUITE_LIVE=false");
    return;
  }

  const nl = makeSkillsInstance();
  try {
    const result = await nl.generate({
      input: {
        text: "A customer's refund is disputed and I need to escalate. What are the exact steps? Use your skills.",
      },
      provider: TEST_PROVIDER,
      maxSteps: 4,
      timeout: 120_000,
    });

    const content = result.content ?? "";
    const executions = (result.toolExecutions ?? []) as Array<{
      toolName?: string;
      tool?: string;
    }>;
    const usedTool = executions.some(
      (execution) =>
        execution.toolName === "use_skill" || execution.tool === "use_skill",
    );
    const followedSkill =
      content.includes("payments-oncall") ||
      content.toLowerCase().includes("transaction id");

    // The tool execution is the hard requirement; instruction phrasing in
    // the answer is informational (models paraphrase).
    if (usedTool) {
      logTest(
        LIVE_NAME,
        "PASS",
        `toolCalled=true followedInstructions=${followedSkill}`,
      );
    } else {
      logTest(
        LIVE_NAME,
        "FAIL",
        `Model did not invoke use_skill. Content: ${content.slice(0, 200)}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logTest(
      LIVE_NAME,
      "SKIP",
      `Provider "${TEST_PROVIDER}" unavailable: ${message.slice(0, 160)}`,
    );
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  log("\n============================================================", "cyan");
  log("  NeuroLink Continuous Test Suite: SKILLS", "cyan");
  log("============================================================\n", "cyan");

  await testToolRegistration();
  await testSearch();
  await testFilesystemStore();
  await testCustomStore();
  await testDiscovery();
  await testActivation();
  await testMutations();
  await testS3Store();
  await testRedisStore();
  await testCli();
  await testServerRoutes();
  await testLiveGenerate();

  const pass = testResults.filter((r) => r.result === "PASS").length;
  const fail = testResults.filter((r) => r.result === "FAIL").length;
  const skip = testResults.filter((r) => r.result === "SKIP").length;

  log("\n============================================================", "cyan");
  log(
    `  RESULTS: ${pass} passed, ${fail} failed, ${skip} skipped (of ${testResults.length})`,
    fail > 0 ? "red" : "green",
  );
  log("============================================================\n", "cyan");

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  log(`Suite crashed: ${error instanceof Error ? error.stack : error}`, "red");
  process.exit(1);
});
