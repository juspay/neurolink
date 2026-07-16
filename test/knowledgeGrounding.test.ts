/**
 * Unit tests for lexical-first knowledge grounding (src/lib/knowledge/**).
 *
 * Run:
 *   pnpm exec vitest run test/knowledgeGrounding.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  normalizePhrases,
  normalizeText,
  tokenize,
} from "../src/lib/knowledge/normalize.js";
import {
  manifestToSources,
  normalizeAndValidate,
  resolveEntry,
} from "../src/lib/knowledge/resolve.js";
import {
  buildKnowledgeIndexCacheKey,
  getOrBuildKnowledgeIndexSnapshot,
  KNOWLEDGE_INDEX_CACHE_LIMIT,
} from "../src/lib/knowledge/indexCache.js";
import { buildIndexSnapshot } from "../src/lib/knowledge/knowledgeIndex.js";
import { retrieve } from "../src/lib/knowledge/retrieval.js";
import { assembleKnowledgeContext } from "../src/lib/knowledge/context.js";
import { KnowledgeGroundingEngine } from "../src/lib/knowledge/engine.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import {
  DEFAULT_ALIAS_BOOST,
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_EXACT_BOOST,
  DEFAULT_FIELD_WEIGHTS,
  DEFAULT_RELATION_LIMIT,
  DEFAULT_RESULT_LIMIT,
} from "../src/lib/knowledge/defaults.js";
import type {
  KnowledgeEntryInput,
  KnowledgeIndexSnapshot,
  KnowledgeManifest,
  KnowledgeResolvedRetrieval,
  KnowledgeRetrievalRequest,
  KnowledgeSource,
  KnowledgeGroundingOutcome,
  DynamicOptions,
  DynamicResolutionContext,
  ChatMessage,
} from "../src/lib/types/index.js";

const RESOLVED: KnowledgeResolvedRetrieval = {
  candidateLimit: DEFAULT_CANDIDATE_LIMIT,
  resultLimit: DEFAULT_RESULT_LIMIT,
  relationLimit: DEFAULT_RELATION_LIMIT,
  fieldWeights: DEFAULT_FIELD_WEIGHTS,
  exactBoost: DEFAULT_EXACT_BOOST,
  aliasBoost: DEFAULT_ALIAS_BOOST,
};

const settingsSource: KnowledgeSource = {
  id: "account-settings",
  version: "1",
  entries: [
    {
      id: "settings.multi-step-flow",
      title: "Multi-Step Flow",
      summary: "Splits a workflow into two guided steps.",
      body: "The multi-step flow divides a workflow into two sequential guided steps.",
      domain: "account-settings",
      integrations: ["integration-a"],
      kind: "configuration",
      aliases: ["multi step flow", "enableMultiStepFlow"],
      relatedEntryIds: ["settings.verification-gate"],
    },
    {
      id: "settings.verification-gate",
      title: "Verification Gate",
      summary: "Requires identity verification before a protected action.",
      domain: "account-settings",
      integrations: ["integration-a"],
      kind: "configuration",
      aliases: ["verification gate", "requireVerification"],
      keywords: ["identity", "verification"],
    },
  ],
};

const policiesSource: KnowledgeSource = {
  id: "access-policies",
  version: "1",
  entries: [
    {
      id: "policies.taxonomy",
      title: "Access policy classifications",
      summary: "Access policies are classified along independent dimensions.",
      body: "Subject type describes who a policy applies to; action type describes what it permits.",
      domain: "access-policies",
      integrations: [],
      kind: "concept",
      aliases: ["policy types", "types of access policies"],
    },
  ],
};

const buildSnapshot = async (
  sources: KnowledgeSource[],
): Promise<KnowledgeIndexSnapshot> => {
  const { entries, validation } = await normalizeAndValidate(sources, {
    manifestVersion: "1",
  });
  expect(validation.ok).toBe(true);
  return buildIndexSnapshot(entries, DEFAULT_FIELD_WEIGHTS);
};

const makeRequest = (
  query: string,
  overrides: Partial<KnowledgeRetrievalRequest> = {},
): KnowledgeRetrievalRequest => ({
  query,
  recentTurns: [],
  enabledIntegrations: ["integration-a"],
  ...overrides,
});

describe("normalizeText", () => {
  it("splits camelCase into words", () => {
    expect(normalizeText("enableMultiStepFlow")).toBe("enable multi step flow");
  });
  it("normalizes title case + hyphens", () => {
    expect(normalizeText("Multi-Step Flow")).toBe("multi step flow");
  });
  it("normalizes SNAKE_CASE and acronyms", () => {
    expect(normalizeText("ACCOUNT_STATUS")).toBe("account status");
    expect(normalizeText("enableURLReading")).toBe("enable url reading");
  });
  it("collapses repeated whitespace", () => {
    expect(normalizeText("  Access   Policy  ")).toBe("access policy");
  });
  it("is idempotent", () => {
    const once = normalizeText("customAccessOptionsV2Enabled");
    expect(normalizeText(once)).toBe(once);
  });
  it("tokenizes and preserves numbers", () => {
    expect(tokenize("gemini-3-flash")).toEqual(["gemini", "3", "flash"]);
    expect(tokenize("")).toEqual([]);
  });
  it("de-duplicates normalized phrases", () => {
    expect(
      normalizePhrases(["Multi-Step Flow", "multi step flow", ""]),
    ).toEqual(["multi step flow"]);
  });
});

describe("resolveEntry + normalizeAndValidate", () => {
  it("materializes omitted optionals against SDK defaults", () => {
    const entry = resolveEntry(
      {
        id: "x",
        title: "X",
        summary: "s",
        domain: "d",
        integrations: [],
      },
      "7",
    );
    expect(entry.domain).toBe("d");
    expect(entry.status).toBe("active"); // SDK default
    expect(entry.kind).toBe("text"); // SDK default
    expect(entry.version).toBe("7");
    expect(entry.aliases).toEqual([]);
    expect(entry.body).toBe("");
  });

  it("clones authored arrays while resolving entries", () => {
    const integrations = ["integration-a"];
    const aliases = ["alias-a"];
    const keywords = ["keyword-a"];
    const relatedEntryIds = ["related-a"];
    const entry = resolveEntry(
      {
        id: "x",
        title: "X",
        summary: "s",
        domain: "d",
        integrations,
        aliases,
        keywords,
        relatedEntryIds,
      },
      "7",
    );

    integrations.push("integration-b");
    aliases.push("alias-b");
    keywords.push("keyword-b");
    relatedEntryIds.push("related-b");

    expect(entry.integrations).toEqual(["integration-a"]);
    expect(entry.aliases).toEqual(["alias-a"]);
    expect(entry.keywords).toEqual(["keyword-a"]);
    expect(entry.relatedEntryIds).toEqual(["related-a"]);
  });

  it("flags missing or invalid integrations as errors", async () => {
    const src: KnowledgeSource = {
      id: "s",
      version: "1",
      entries: [
        {
          id: "missing",
          title: "Missing",
          summary: "s",
          domain: "d",
        } as unknown as KnowledgeEntryInput,
        {
          id: "bad",
          title: "Bad",
          summary: "s",
          domain: "d",
          integrations: ["ok", 123],
        } as unknown as KnowledgeEntryInput,
      ],
    };
    const { validation } = await normalizeAndValidate([src], {
      manifestVersion: "1",
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.issues.some((issue) => issue.code === "missing-integrations"),
    ).toBe(true);
    expect(
      validation.issues.some((issue) => issue.code === "bad-integrations"),
    ).toBe(true);
  });

  it("flags duplicate ids as errors", async () => {
    const dup: KnowledgeSource = {
      id: "s",
      version: "1",
      entries: [
        {
          id: "a",
          title: "A",
          summary: "s",
          domain: "d",
          integrations: [],
        },
        {
          id: "a",
          title: "A2",
          summary: "s2",
          domain: "d",
          integrations: [],
        },
      ],
    };
    const { validation } = await normalizeAndValidate([dup], {
      manifestVersion: "1",
    });
    expect(validation.ok).toBe(false);
    expect(
      validation.issues.some((issue) => issue.code === "duplicate-entry-id"),
    ).toBe(true);
  });

  it("flags missing title and missing domain as errors", async () => {
    const bad: KnowledgeSource = {
      id: "s",
      version: "1",
      entries: [
        {
          id: "a",
          title: "",
          summary: "s",
          integrations: [],
        } as unknown as KnowledgeEntryInput, // deliberately omits domain
      ],
    };
    const { validation } = await normalizeAndValidate([bad], {
      manifestVersion: "1",
    });
    expect(validation.ok).toBe(false);
    expect(
      validation.issues.some((issue) => issue.code === "missing-title"),
    ).toBe(true);
    expect(
      validation.issues.some((issue) => issue.code === "missing-domain"),
    ).toBe(true);
  });

  it("treats a broken relation as a warning, not an error", async () => {
    const src: KnowledgeSource = {
      id: "s",
      version: "1",
      entries: [
        {
          id: "a",
          title: "A",
          summary: "s",
          domain: "d",
          integrations: [],
          relatedEntryIds: ["missing"],
        },
      ],
    };
    const { validation } = await normalizeAndValidate([src], {
      manifestVersion: "1",
    });
    expect(validation.ok).toBe(true);
    expect(
      validation.issues.some((issue) => issue.code === "broken-relation"),
    ).toBe(true);
  });

  it("expands a manifest into sources", () => {
    const manifest: KnowledgeManifest = {
      schemaVersion: "1",
      contentVersion: "2026-07-14.1",
      generatedAt: "2026-07-14T00:00:00.000Z",
      catalogs: [
        {
          id: "c",
          entries: [
            {
              id: "c.a",
              title: "A",
              summary: "s",
              domain: "c",
              integrations: [],
            },
          ],
        },
      ],
    };
    const sources = manifestToSources(manifest);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "c", version: "2026-07-14.1" });
  });
});

describe("buildIndexSnapshot", () => {
  it("indexes exact keys, aliases, and relations", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    // exact keys come from id + title only.
    expect(snapshot.exactIndex.get("multi step flow")).toBeDefined();
    expect(snapshot.exactIndex.get("settings multi step flow")).toBeDefined();
    // the raw config key lives in aliases now.
    expect(
      snapshot.aliasIndex
        .get("enable multi step flow")
        ?.has("settings.multi-step-flow"),
    ).toBe(true);
    expect(snapshot.relationIndex.get("settings.multi-step-flow")).toContain(
      "settings.verification-gate",
    );
  });
});

describe("retrieve", () => {
  it("returns an exact/alias hit at high confidence", async () => {
    const snapshot = await buildSnapshot([settingsSource, policiesSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("enable multi step flow"),
      RESOLVED,
    );
    expect(selection.primary[0]?.id).toBe("settings.multi-step-flow");
    expect(selection.confidence).toBe("high");
  });

  it("finds a paraphrase via BM25 without an exact hit", async () => {
    const snapshot = await buildSnapshot([settingsSource, policiesSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("which setting controls guided workflow steps"),
      RESOLVED,
    );
    expect(selection.primary.map((entry) => entry.id)).toContain(
      "settings.multi-step-flow",
    );
    expect(["medium", "low"]).toContain(selection.confidence);
    expect(selection.candidates[0]?.exact).toBe(false);
  });

  it("filters unauthorized entries before lexical top-k truncation", async () => {
    const snapshot = await buildSnapshot([
      {
        id: "lexical-crowding",
        version: "1",
        entries: [
          {
            id: "a.blocked-one",
            title: "Blocked one",
            summary: "shared lexical crowding signal",
            domain: "blocked",
            integrations: [],
          },
          {
            id: "b.blocked-two",
            title: "Blocked two",
            summary: "shared lexical crowding signal",
            domain: "blocked",
            integrations: [],
          },
          {
            id: "z.allowed",
            title: "Allowed",
            summary: "shared lexical crowding signal",
            domain: "allowed",
            integrations: [],
          },
        ],
      },
    ]);
    const selection = retrieve(
      snapshot,
      makeRequest("shared lexical crowding signal"),
      { ...RESOLVED, candidateLimit: 1, resultLimit: 1 },
      ["blocked"],
    );

    expect(selection.primary[0]?.id).toBe("z.allowed");
    expect(selection.candidateCount).toBe(1);
  });

  it("resolves a reviewed alias phrase", async () => {
    const snapshot = await buildSnapshot([settingsSource, policiesSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("what policy types exist"),
      RESOLVED,
    );
    expect(selection.primary[0]?.id).toBe("policies.taxonomy");
    expect(selection.confidence).toBe("high");
  });

  it("boosts reviewed alias phrases longer than six tokens", async () => {
    const snapshot = await buildSnapshot([
      {
        id: "checkout",
        version: "1",
        entries: [
          {
            id: "checkout.cod-visibility",
            title: "COD visibility",
            summary: "Explains why COD may not appear during checkout.",
            domain: "checkout",
            integrations: [],
            aliases: [
              "cash on delivery payment method is missing from checkout",
            ],
          },
        ],
      },
    ]);
    const selection = retrieve(
      snapshot,
      makeRequest("cash on delivery payment method is missing from checkout"),
      RESOLVED,
    );

    expect(selection.primary[0]?.id).toBe("checkout.cod-visibility");
    expect(selection.candidates[0]?.alias).toBe(true);
    expect(selection.confidence).toBe("high");
  });

  it("excludes entries for disabled integrations", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow", {
        enabledIntegrations: ["integration-b"],
      }),
      RESOLVED,
    );
    expect(selection.primary.map((entry) => entry.id)).not.toContain(
      "settings.multi-step-flow",
    );
  });

  it("excludes integration-specific entries when no integration is enabled", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow", { enabledIntegrations: [] }),
      RESOLVED,
    );
    expect(selection.primary.map((entry) => entry.id)).not.toContain(
      "settings.multi-step-flow",
    );
  });

  it("keeps integration-independent entries when no integration is enabled", async () => {
    const snapshot = await buildSnapshot([policiesSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("policy types", { enabledIntegrations: [] }),
      RESOLVED,
    );
    expect(selection.primary.map((entry) => entry.id)).toContain(
      "policies.taxonomy",
    );
  });

  it("expands directly-related entries after primary retrieval", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow"),
      RESOLVED,
    );
    expect(selection.primary[0]?.id).toBe("settings.multi-step-flow");
    expect(selection.expanded.map((entry) => entry.id)).toContain(
      "settings.verification-gate",
    );
  });

  it("excludes configured blocked domains when set", async () => {
    const snapshot = await buildSnapshot([settingsSource, policiesSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("policy types"),
      RESOLVED,
      ["access-policies"],
    );
    expect(selection.primary.map((entry) => entry.id)).not.toContain(
      "policies.taxonomy",
    );
  });

  it("returns none for a no-match query", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("xyzzy quux nonsense"),
      RESOLVED,
    );
    expect(selection.candidateCount).toBe(0);
    expect(selection.confidence).toBe("none");
  });

  it("classifies a single weak lexical-only candidate as low confidence", async () => {
    const snapshot = await buildSnapshot([
      {
        id: "single-weak",
        version: "1",
        entries: [
          {
            id: "single.summary-only",
            title: "Unrelated title",
            summary: "singleweakterm",
            domain: "single",
            integrations: [],
          },
        ],
      },
    ]);
    const selection = retrieve(
      snapshot,
      makeRequest("singleweakterm"),
      RESOLVED,
    );

    expect(selection.candidateCount).toBe(1);
    expect(selection.candidates[0]?.exact).toBe(false);
    expect(selection.candidates[0]?.alias).toBe(false);
    expect(selection.confidence).toBe("low");
  });
});

describe("assembleKnowledgeContext", () => {
  it("emits a delimited block with citations", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow"),
      RESOLVED,
    );
    const assembled = assembleKnowledgeContext(selection, {
      maxTokens: 4000,
      includeCitations: true,
    });
    expect(assembled.assembledContext).toContain("<knowledge_context>");
    expect(assembled.assembledContext).toContain(
      "[KB:settings.multi-step-flow@1]",
    );
    expect(assembled.assembledContext).toContain("Multi-Step Flow");
    expect(assembled.contextTokens).toBeGreaterThan(0);
    expect(
      assembled.citations.some(
        (citation) => citation.id === "settings.multi-step-flow",
      ),
    ).toBe(true);
  });

  it("truncates under a tight token budget", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow"),
      RESOLVED,
    );
    const assembled = assembleKnowledgeContext(selection, {
      maxTokens: 40,
      includeCitations: true,
    });
    expect(assembled.truncated).toBe(true);
  });

  it("omits citations when disabled", async () => {
    const snapshot = await buildSnapshot([settingsSource]);
    const selection = retrieve(
      snapshot,
      makeRequest("multi step flow"),
      RESOLVED,
    );
    const assembled = assembleKnowledgeContext(selection, {
      includeCitations: false,
    });
    expect(assembled.assembledContext).not.toContain("[KB:");
  });
});

describe("KnowledgeGroundingEngine", () => {
  it("returns no grounding when disabled", async () => {
    const engine = new KnowledgeGroundingEngine({
      enabled: false,
      sources: [settingsSource],
    });
    const outcome = await engine.ground({ query: "multi step flow" });
    expect(outcome.ephemeralContext).toBeNull();
    expect(outcome.metadata.selectedIds).toEqual([]);
  });

  it("grounds an enabled turn end to end", async () => {
    const engine = new KnowledgeGroundingEngine({
      enabled: true,
      sources: [settingsSource, policiesSource],
    });
    const outcome = await engine.ground({
      query: "enable multi step flow",
      scope: { enabledIntegrations: ["integration-a"] },
    });
    expect(outcome.ephemeralContext).not.toBeNull();
    expect(outcome.ephemeralContext?.content).toContain("Multi-Step Flow");
    expect(outcome.ephemeralContext?.kind).toBe("knowledge");
    expect(outcome.metadata.selectedIds).toContain("settings.multi-step-flow");
    expect(outcome.metadata.confidence).toBe("high");
  });

  it("fails open when grounding exceeds its timeout", async () => {
    const engine = new KnowledgeGroundingEngine({
      enabled: true,
      sources: [settingsSource],
      timeoutMs: 5,
    });
    await engine.ready();
    (
      engine as unknown as {
        ready: () => Promise<void>;
      }
    ).ready = () => new Promise(() => undefined);

    const outcome = await engine.ground({ query: "multi step flow" });

    expect(outcome.ephemeralContext).toBeNull();
    expect(outcome.metadata.failureReason).toContain("timed out");
  });
});

describe("knowledge index cache", () => {
  it("does not collide when ids contain cache-key delimiters", () => {
    const entry: KnowledgeEntryInput = {
      id: "d",
      title: "D",
      summary: "D",
      domain: "x",
      integrations: [],
    };
    const sourceWithDelimitedId: KnowledgeSource = {
      id: "a:b",
      version: "c",
      entries: [entry],
    };
    const sourceWithDelimitedVersion: KnowledgeSource = {
      id: "a",
      version: "b:c",
      entries: [entry],
    };

    expect(
      buildKnowledgeIndexCacheKey(
        [sourceWithDelimitedId],
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      ),
    ).not.toBe(
      buildKnowledgeIndexCacheKey(
        [sourceWithDelimitedVersion],
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      ),
    );
  });

  it("changes the key when effective source content changes", () => {
    const baseSource: KnowledgeSource = {
      id: "same-source",
      version: "same-version",
      entries: [
        {
          id: "same-entry",
          title: "Same title",
          summary: "Same summary",
          body: "Original body",
          domain: "cache-test",
          integrations: ["integration-a"],
          aliases: ["same alias"],
        },
      ],
    };
    const changedBodySource: KnowledgeSource = {
      ...baseSource,
      entries: [{ ...baseSource.entries[0], body: "Changed body" }],
    };

    expect(
      buildKnowledgeIndexCacheKey(
        [baseSource],
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      ),
    ).not.toBe(
      buildKnowledgeIndexCacheKey(
        [changedBodySource],
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      ),
    );
  });

  it("uses canonical entry ordering for source content hashes", () => {
    const firstEntry: KnowledgeEntryInput = {
      id: "a",
      title: "A",
      summary: "A summary",
      domain: "cache-test",
      integrations: ["integration-a"],
      aliases: ["alpha"],
    };
    const secondEntry: KnowledgeEntryInput = {
      id: "b",
      title: "B",
      summary: "B summary",
      domain: "cache-test",
      integrations: ["integration-b"],
      aliases: ["beta"],
    };
    const source: KnowledgeSource = {
      id: "ordered-source",
      version: "1",
      entries: [firstEntry, secondEntry],
    };
    const reorderedSource: KnowledgeSource = {
      ...source,
      entries: [secondEntry, firstEntry],
    };

    expect(
      buildKnowledgeIndexCacheKey([source], "fallback", DEFAULT_FIELD_WEIGHTS),
    ).toBe(
      buildKnowledgeIndexCacheKey(
        [reorderedSource],
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      ),
    );
  });

  it("bounds cached snapshots and refreshes recently used entries", async () => {
    const makeSource = (index: number): KnowledgeSource => ({
      id: `source-${index}`,
      version: "1",
      entries: [
        {
          id: `entry-${index}`,
          title: `Entry ${index}`,
          summary: `Summary ${index}`,
          domain: "cache-test",
          integrations: [],
        },
      ],
    });
    const sources = Array.from(
      { length: KNOWLEDGE_INDEX_CACHE_LIMIT + 1 },
      (_, index) => [makeSource(index)],
    );
    const warmupSources = Array.from(
      { length: KNOWLEDGE_INDEX_CACHE_LIMIT },
      (_, index) => [makeSource(index + sources.length)],
    );

    for (const sourceSet of warmupSources) {
      await getOrBuildKnowledgeIndexSnapshot(
        sourceSet,
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      );
    }

    const initialSnapshots: Array<unknown> = [];
    for (const sourceSet of sources.slice(0, KNOWLEDGE_INDEX_CACHE_LIMIT)) {
      const result = await getOrBuildKnowledgeIndexSnapshot(
        sourceSet,
        "fallback",
        DEFAULT_FIELD_WEIGHTS,
      );
      initialSnapshots.push(result.snapshot);
    }

    const refreshedFirst = await getOrBuildKnowledgeIndexSnapshot(
      sources[0],
      "fallback",
      DEFAULT_FIELD_WEIGHTS,
    );
    await getOrBuildKnowledgeIndexSnapshot(
      sources[KNOWLEDGE_INDEX_CACHE_LIMIT],
      "fallback",
      DEFAULT_FIELD_WEIGHTS,
    );
    const rebuiltSecond = await getOrBuildKnowledgeIndexSnapshot(
      sources[1],
      "fallback",
      DEFAULT_FIELD_WEIGHTS,
    );

    expect(refreshedFirst.snapshot).toBe(initialSnapshots[0]);
    expect(rebuiltSecond.snapshot).not.toBe(initialSnapshots[1]);
  });
});

describe("NeuroLink knowledge grounding wiring", () => {
  type KnowledgeGroundingInternals = {
    appendKnowledgeGroundingBlockToSystemPrompt: (
      systemPrompt: unknown,
      block: string,
    ) => DynamicOptions["systemPrompt"];
    resolveDynamicOptions: (options: Record<string, unknown>) => Promise<void>;
    retrieveKnowledgeGrounding: (options: {
      input: { text: string };
      conversationMessages?: ChatMessage[];
      useKnowledgeGrounding?: boolean;
      knowledgeContext?: { enabledIntegrations?: string[] };
    }) => Promise<KnowledgeGroundingOutcome | undefined>;
    fetchRecentRoutingHistory: (options: unknown) => Promise<ChatMessage[]>;
  };

  it("does not construct an engine when enabled without sources", () => {
    // Simulates malformed JS/dynamic runtime config. TypeScript callers must
    // provide `sources` because KnowledgeGroundingConfig requires it.
    const misconfigured = {
      knowledgeGrounding: { enabled: true },
    } as unknown as ConstructorParameters<typeof NeuroLink>[0];
    const neurolink = new NeuroLink(misconfigured);

    expect(neurolink.getKnowledgeStatus()).toBeNull();
  });

  it("constructs an engine when enabled with sources", () => {
    const neurolink = new NeuroLink({
      knowledgeGrounding: {
        enabled: true,
        sources: [settingsSource],
      },
    });

    expect(neurolink.getKnowledgeStatus()?.enabled).toBe(true);
  });

  it("requires an explicit per-call opt-in before retrieving knowledge", async () => {
    const neurolink = new NeuroLink({
      knowledgeGrounding: {
        enabled: true,
        sources: [settingsSource],
      },
    });
    const internals = neurolink as unknown as KnowledgeGroundingInternals;
    let fetchedHistory = false;
    internals.fetchRecentRoutingHistory = async () => {
      fetchedHistory = true;
      return [];
    };

    const outcome = await internals.retrieveKnowledgeGrounding({
      input: { text: "multi step flow" },
    });

    expect(outcome).toBeUndefined();
    expect(fetchedHistory).toBe(false);
  });

  it("grounds and then resolves a dynamic system prompt", async () => {
    const neurolink = new NeuroLink({
      knowledgeGrounding: {
        enabled: true,
        sources: [settingsSource],
      },
    });
    const internals = neurolink as unknown as KnowledgeGroundingInternals;
    const options: DynamicOptions = {
      input: { text: "multi step flow" },
      useKnowledgeGrounding: true,
      knowledgeContext: { enabledIntegrations: ["integration-a"] },
      systemPrompt: (context: DynamicResolutionContext) =>
        `You are helping ${
          (context.requestContext.user as { id?: string }).id
        }.`,
      dynamicContext: { user: { id: "user-123" } },
    };

    const outcome = await internals.retrieveKnowledgeGrounding(options);
    const block = outcome?.ephemeralContext?.content ?? "";
    expect(block).not.toBe("");

    options.systemPrompt =
      internals.appendKnowledgeGroundingBlockToSystemPrompt(
        options.systemPrompt,
        block,
      );
    await internals.resolveDynamicOptions(
      options as unknown as Record<string, unknown>,
    );

    expect(options.systemPrompt).toBe(`You are helping user-123.\n\n${block}`);
  });

  it("keeps string system prompts as resolved text before grounding context", async () => {
    const neurolink = new NeuroLink();
    const internals = neurolink as unknown as KnowledgeGroundingInternals;

    expect(
      internals.appendKnowledgeGroundingBlockToSystemPrompt(
        "Base prompt",
        "Knowledge block",
      ),
    ).toBe("Base prompt\n\nKnowledge block");
  });

  it("preserves an explicit empty conversationMessages array for grounding", async () => {
    const neurolink = new NeuroLink({
      knowledgeGrounding: {
        enabled: true,
        sources: [settingsSource],
      },
    });
    const internals = neurolink as unknown as KnowledgeGroundingInternals;
    let fetchedHistory = false;
    internals.fetchRecentRoutingHistory = async () => {
      fetchedHistory = true;
      return [];
    };

    const outcome = await internals.retrieveKnowledgeGrounding({
      input: { text: "multi step flow" },
      conversationMessages: [],
      useKnowledgeGrounding: true,
      knowledgeContext: { enabledIntegrations: ["integration-a"] },
    });

    expect(outcome).toBeDefined();
    expect(fetchedHistory).toBe(false);
  });

  it("fetches recent routing history when conversationMessages is undefined", async () => {
    const neurolink = new NeuroLink({
      knowledgeGrounding: {
        enabled: true,
        sources: [settingsSource],
      },
    });
    const internals = neurolink as unknown as KnowledgeGroundingInternals;
    let fetchedHistory = false;
    internals.fetchRecentRoutingHistory = async () => {
      fetchedHistory = true;
      return [
        {
          role: "user",
          content: "Earlier turn",
        },
      ];
    };

    const outcome = await internals.retrieveKnowledgeGrounding({
      input: { text: "multi step flow" },
      useKnowledgeGrounding: true,
      knowledgeContext: { enabledIntegrations: ["integration-a"] },
    });

    expect(outcome).toBeDefined();
    expect(fetchedHistory).toBe(true);
  });
});
