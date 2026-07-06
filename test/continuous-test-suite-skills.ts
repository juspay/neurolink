#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Skills
 *
 * Tests the native skills subsystem end-to-end:
 * - Built-in tool registration (search_skills / list_skills, gated mutation tools)
 * - InMemory + FileSystem stores (JSON, frontmatter .md, <dir>/SKILL.md layouts)
 * - S3 store (hermetic via injected object ops: round-trip, index upsert, self-heal,
 *   fail-open error when @aws-sdk/client-s3 is absent)
 * - Redis store (round-trip + SCAN index; SKIPs when Redis is unreachable)
 * - Custom store plug-in
 * - Index-first search semantics (no_match envelope, scope/tag filters, maxMatches)
 * - SkillsManager API via getSkillsManager()
 * - Prompt-index injection (block content, per-call disable, media-mode skip)
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
    "1. search_skills + list_skills registered when enabled",
    async () => {
      const nl = makeSkillsInstance();
      const tools = nl.getCustomTools();
      assert(tools.has("search_skills"), "search_skills missing");
      assert(tools.has("list_skills"), "list_skills missing");
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
    assert(!tools.has("search_skills"), "search_skills must not be registered");
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
// TESTS — search semantics through the registered tool
// ============================================================

type ToolExecute = (params: unknown, ctx?: unknown) => Promise<unknown>;

function getToolExecute(nl: NeuroLink, name: string): ToolExecute {
  const tool = nl.getCustomTools().get(name);
  assert(tool, `${name} not registered`);
  return tool.execute as ToolExecute;
}

async function testSearchTool(): Promise<void> {
  await runTest(
    "4. search_skills returns hydrated match with instructions",
    async () => {
      const nl = makeSkillsInstance();
      const execute = getToolExecute(nl, "search_skills");
      const result = (await execute({ query: "refund" })) as {
        success: boolean;
        data: { skills: Array<{ name: string; instructions: string }> };
      };
      assert(result.success, "expected success");
      assert(
        result.data.skills.length === 1,
        `expected 1 match, got ${result.data.skills.length}`,
      );
      assert(
        result.data.skills[0].name === "refund_dispute_escalation",
        "wrong skill matched",
      );
      assert(
        result.data.skills[0].instructions.includes("payments-oncall"),
        "instructions not hydrated",
      );
    },
  );

  await runTest("5. search_skills no_match is success, not error", async () => {
    const nl = makeSkillsInstance();
    const execute = getToolExecute(nl, "search_skills");
    const result = (await execute({ query: "quantum-chromodynamics" })) as {
      success: boolean;
      data: { skills: unknown[]; reason?: string };
    };
    assert(result.success, "no_match must be success:true");
    assert(result.data.reason === "no_match", "expected reason=no_match");
    assert(result.data.skills.length === 0, "expected empty skills");
  });

  await runTest("6. search_skills requires query or tag", async () => {
    const nl = makeSkillsInstance();
    const execute = getToolExecute(nl, "search_skills");
    const result = (await execute({})) as { success: boolean; error?: string };
    assert(!result.success, "parameterless call must fail");
    assert(
      (result.error ?? "").includes("query"),
      "error should mention required params",
    );
  });

  await runTest("7. tag filter applies on top of query", async () => {
    const nl = makeSkillsInstance();
    const execute = getToolExecute(nl, "search_skills");
    // "procedure"/"deploy" matches service_deployment; wrong tag excludes it
    const result = (await execute({ query: "deploy", tag: "payments" })) as {
      success: boolean;
      data: { skills: unknown[]; reason?: string };
    };
    assert(result.success, "expected success");
    assert(result.data.reason === "no_match", "wrong tag must exclude match");
  });

  await runTest(
    "8. scoped skills excluded for other scopes, included for own",
    async () => {
      const nl = makeSkillsInstance();
      const execute = getToolExecute(nl, "search_skills");
      const foreign = (await execute({
        query: "standup",
        scopeId: "team-beta",
      })) as { data: { skills: unknown[] } };
      assert(
        foreign.data.skills.length === 0,
        "scoped skill leaked into foreign scope",
      );
      const own = (await execute({
        query: "standup",
        scopeId: "team-alpha",
      })) as { data: { skills: Array<{ name: string }> } };
      assert(
        own.data.skills.length === 1 &&
          own.data.skills[0].name === "team_alpha_standup",
        "scoped skill missing in own scope",
      );
    },
  );

  await runTest(
    "9. list_skills returns index without instructions",
    async () => {
      const nl = makeSkillsInstance();
      const execute = getToolExecute(nl, "list_skills");
      const result = (await execute({})) as {
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

  await runTest("10. maxMatches caps hydrated results", async () => {
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
    const execute = getToolExecute(nl, "search_skills");
    const result = (await execute({ query: "bulk" })) as {
      data: { skills: unknown[] };
    };
    assert(
      result.data.skills.length === 3,
      `expected 3 (maxMatches), got ${result.data.skills.length}`,
    );
  });
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
  // Layout 3: Claude-skills directory
  fs.mkdirSync(path.join(dir, "release-notes"));
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
      const execute = getToolExecute(nl, "search_skills");
      const result = (await execute({ query: "refund" })) as {
        data: { skills: Array<{ instructions: string }> };
      };
      assert(result.data.skills.length === 1, "custom store match failed");
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

async function testPromptIndex(): Promise<void> {
  await runTest(
    "15. buildPromptIndex: names+descriptions, no instructions",
    async () => {
      const nl = makeSkillsInstance();
      const manager = nl.getSkillsManager();
      assert(manager, "manager missing");
      const block = await manager.buildPromptIndex();
      assert(block, "expected a prompt block");
      assert(block.includes("## Available Skills"), "missing header");
      assert(block.includes("refund_dispute_escalation"), "missing skill name");
      assert(block.includes("search_skills"), "missing tool guidance");
      assert(
        !block.includes("payments-oncall"),
        "instructions leaked into prompt index",
      );
    },
  );

  await runTest(
    "16. applySkillsPromptIndex appends to systemPrompt",
    async () => {
      const nl = makeSkillsInstance();
      // Private at the TS level only — dist is plain JS. Reaching in keeps this
      // a no-API test of the exact injection path generate()/stream() use.
      const apply = (
        nl as unknown as {
          applySkillsPromptIndex: (o: Record<string, unknown>) => Promise<void>;
        }
      ).applySkillsPromptIndex.bind(nl);

      const options: Record<string, unknown> = {
        systemPrompt: "You are Tara.",
      };
      await apply(options);
      const prompt = options.systemPrompt as string;
      assert(prompt.startsWith("You are Tara."), "base prompt lost");
      assert(prompt.includes("## Available Skills"), "index not appended");

      // Per-call disable
      const disabled: Record<string, unknown> = {
        systemPrompt: "base",
        skills: { enabled: false },
      };
      await apply(disabled);
      assert(disabled.systemPrompt === "base", "per-call disable ignored");

      // promptIndex=false per call
      const noIndex: Record<string, unknown> = {
        systemPrompt: "base",
        skills: { promptIndex: false },
      };
      await apply(noIndex);
      assert(
        noIndex.systemPrompt === "base",
        "per-call promptIndex=false ignored",
      );

      // Media-only mode skipped
      const media: Record<string, unknown> = {
        systemPrompt: "base",
        output: { mode: "video" },
      };
      await apply(media);
      assert(media.systemPrompt === "base", "media mode must skip injection");

      // Scope filter narrows the block
      const scoped: Record<string, unknown> = {
        systemPrompt: "",
        skills: { scopeId: "team-beta" },
      };
      await apply(scoped);
      assert(
        !(scoped.systemPrompt as string).includes("team_alpha_standup"),
        "foreign-scope skill leaked into prompt index",
      );
    },
  );

  await runTest(
    "17. Instance promptIndex=false disables injection",
    async () => {
      const nl = makeSkillsInstance({ promptIndex: false });
      const apply = (
        nl as unknown as {
          applySkillsPromptIndex: (o: Record<string, unknown>) => Promise<void>;
        }
      ).applySkillsPromptIndex.bind(nl);
      const options: Record<string, unknown> = { systemPrompt: "base" };
      await apply(options);
      assert(options.systemPrompt === "base", "instance-level disable ignored");
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
      const search = getToolExecute(nl, "search_skills");
      const after = (await search({ query: "refund" })) as {
        data: { skills: unknown[]; reason?: string };
      };
      assert(
        after.data.reason === "no_match",
        "deprecated skill still matches",
      );
      const list = getToolExecute(nl, "list_skills");
      const listed = (await list({})) as { data: { count: number } };
      assert(listed.data.count === 2, "deprecated skill still listed");
    },
  );

  await runTest(
    "22c. get() by name resolves the active skill after soft-delete + same-name recreate (integrity)",
    async () => {
      const nl = makeSkillsInstance({ allowMutations: true });
      const del = getToolExecute(nl, "skill_delete");
      const create = getToolExecute(nl, "skill_create");
      // Soft-delete skill-refund (name "REFUND_dispute_escalation"), then create
      // a new active skill reusing that exact name — allowed, since the clash
      // check only guards active skills. Both entries now share the name.
      await del({ skillId: "skill-refund" });
      const created = (await create({
        name: "REFUND_dispute_escalation",
        description: "Fresh active version of the refund SOP.",
        instructions: "NEW refund handling instructions.",
      })) as { success: boolean };
      assert(created.success, "recreate with the reused name should succeed");
      // Name resolution must be deterministic: the ACTIVE skill, never the stale
      // deprecated one (which a bare index.find would non-deterministically hit).
      const resolved = await nl
        .getSkillsManager()
        ?.get("REFUND_dispute_escalation");
      assert(
        resolved?.status === "active" &&
          resolved?.instructions === "NEW refund handling instructions.",
        `get(name) must resolve the active skill, got status=${resolved?.status}`,
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
      const execute = getToolExecute(nl, "search_skills");
      const result = (await execute({ query: "anything" })) as {
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

    // Full path through NeuroLink config + built-in tool
    const nl = new NeuroLink({
      skills: {
        enabled: true,
        storage: { type: "redis", keyPrefix },
        indexCacheTtlMs: 0,
      },
    });
    const execute = getToolExecute(nl, "search_skills");
    const result = (await execute({ query: "refund" })) as {
      data: { skills: Array<{ name: string }> };
    };
    assert(
      result.data.skills[0]?.name === "refund_dispute_escalation",
      "tool search through redis store failed",
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
        makeServerCtx(nl),
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
        makeServerCtx(nl),
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
  const liveEnabled = process.env.SKILLS_SUITE_LIVE !== "false";
  if (!liveEnabled) {
    logTest(
      "24. Live: model calls search_skills and follows it",
      "SKIP",
      "SKILLS_SUITE_LIVE=false",
    );
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
    const usedTool = JSON.stringify(result.toolExecutions ?? result).includes(
      "search_skills",
    );
    const followedSkill =
      content.includes("payments-oncall") ||
      content.toLowerCase().includes("transaction id");

    if (usedTool || followedSkill) {
      logTest(
        "24. Live: model calls search_skills and follows it",
        "PASS",
        `toolCalled=${usedTool} followedInstructions=${followedSkill}`,
      );
    } else {
      logTest(
        "24. Live: model calls search_skills and follows it",
        "FAIL",
        `Model neither called the tool nor followed instructions. Content: ${content.slice(0, 200)}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logTest(
      "24. Live: model calls search_skills and follows it",
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
  await testSearchTool();
  await testFilesystemStore();
  await testCustomStore();
  await testPromptIndex();
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
