---
title: Skills Guide
description: Native skills — versioned instruction packs (SOPs, playbooks) with progressive disclosure, session-pinned activation, and on-demand resources
keywords:
  [
    skills,
    sops,
    playbooks,
    progressive-disclosure,
    use_skill,
    read_skill_resource,
    list_skills,
    session-persistence,
    prompt-caching,
    maker-checker,
    custom-storage,
  ]
---

# Skills Guide

> **Since**: v9.82.0 | **Status**: Stable | **Availability**: SDK, CLI, Server

## Overview

NeuroLink includes native **skills** support: versioned, discoverable instruction packs (SOPs, playbooks, workflows) the model consults before answering from general knowledge. Skills follow the [Agent Skills](https://agentskills.io) progressive-disclosure architecture — three levels, each loaded only when needed:

1. **Discovery** — a compact listing (name + description, never instructions) is embedded in the `use_skill` tool description on every `generate()`/`stream()` call. The model decides from context when a skill applies; there is no mandatory pre-flight search call.
2. **Activation** — when a skill matches the task, the model calls `use_skill(name)` and receives the **full instructions, never truncated**. The activation is **pinned to the session**: the instructions persist in conversation history, replayed byte-identically on every later turn (provider prompt caches bill them at cached rates), and re-invocations return a tiny `already_loaded` note instead of the body.
3. **Resources** — skills can bundle auxiliary files (`references/*.md`, templates, schemas). They cost zero tokens until the model reads one with `read_skill_resource`.

A 20-skill catalog costs roughly 500–700 tokens of always-on listing; an activated 4K-token SOP is fetched once per session and cached thereafter.

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  skills: {
    enabled: true,
    storage: { type: "filesystem", path: "./skills" },
  },
});

// The model sees the skills listing inside the use_skill tool description
// and loads instructions only when a skill matches the task.
const result = await neurolink.generate({
  input: { text: "A refund is disputed — how do I escalate?" },
  context: { sessionId: "thread-42", userId: "u1" },
});
```

With a `sessionId` and conversation memory configured, an activated skill stays loaded for the whole session — later turns replay it from history instead of re-fetching it. Without conversation memory, activation is per-turn (nothing is pinned, and `use_skill` simply re-fetches when asked again).

## Skill Format

### Directory layout (recommended)

```
skills/
  refund_dispute_escalation/
    SKILL.md               # frontmatter + instructions
    references/
      edge-cases.md        # loaded on demand via read_skill_resource
      escalation-matrix.md
```

`SKILL.md` starts with YAML frontmatter; the markdown body is the instructions:

```markdown
---
name: refund_dispute_escalation
displayName: Refund Dispute Escalation
description: How to escalate a disputed refund to the payments on-call. Use when a customer contests a refund decision.
tags: [payments, escalation]
---

1. Verify the dispute in the payments dashboard…
2. …
```

Every sibling file of `SKILL.md` becomes an on-demand resource, addressable by its relative path (e.g. `references/edge-cases.md`).

### Other accepted layouts

- `<dir>/<name>.md` — single frontmatter markdown file (no resources)
- `<dir>/<id>.json` — JSON-serialized `SkillDefinition` (what mutations write)

Optional fields: `scope: "scoped"` + `scopeIds: [...]` restrict a skill to specific scopes (channels/teams/tenants); `status: "deprecated"` hides it from matching.

### Authoring guidance

- **Description is the matching signal.** Say _what_ the skill does and _when_ to use it, in one or two sentences. The model selects skills purely from descriptions.
- **Keep instructions lean** (guideline: under ~5K tokens). Move rarely-needed detail into `references/` — if information is needed 20% of the time, it belongs in a resource file.
- **Instructions are never truncated or capped** — budgets apply only to the discovery listing, which shortens descriptions uniformly (never drops names) when the catalog outgrows `listingBudgetChars`.

## How Activation Works

```
Turn 1: user asks → model sees listing → use_skill("deploy_sop")
        → full instructions returned (tool result)
        → pinned into session history: ask → [Skill loaded: deploy_sop v3] → answer

Turn 2+: history replays the pinned instructions byte-identically
         (cached prefix for Anthropic cache_control / Gemini implicit caching);
         use_skill("deploy_sop") again → { status: "already_loaded" }
```

Guarantees, in order of the pipeline:

- **Version pinning** — a session keeps the version it activated; a mid-session skill update never mutates instructions the model already follows. New sessions get the new version.
- **Summarization-safe** — when conversation memory summarizes old turns, pinned skill messages are re-included verbatim after the summary.
- **Truncation-safe** — the context compactor's sliding-window stage re-seats pinned skill messages instead of dropping them, and never content-truncates them.
- **Restart-safe** — activation state is derived from the stored history itself (messages carry `metadata.isSkill`), so dedup works across process restarts and multiple instances sharing Redis memory.

Without a `sessionId` (or with `sessionPersistence: false`), activation is per-turn: the instructions still arrive as a tool result for the current turn; nothing is pinned.

## Discovery Modes

| Mode               | Where the listing lives                                            | When to use                                                                                                     |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `"tool"` (default) | `<available_skills>` block inside the `use_skill` tool description | Best default — keeps the host's system prompt untouched and the listing byte-stable for provider prompt caching |
| `"system-prompt"`  | `## Available Skills` index appended to the system prompt          | When you want the listing visible in prompt dumps/debugging                                                     |
| `"none"`           | Nowhere                                                            | Hosts that inject their own discovery or rely on `preload`                                                      |

The listing is rendered from a name-sorted index and is a pure function of it, so calls with the same scope/tag filters render byte-identical listings — a prerequisite for Anthropic `cache_control` prefix caching and Gemini implicit caching. When the catalog exceeds `listingBudgetChars` (default 15000), every description is shortened uniformly (first sentence, then a hard cap); names are never dropped.

## Per-Call Options

```typescript
await neurolink.generate({
  input: { text: "…" },
  context: { sessionId: "thread-42" },
  skills: {
    enabled: true, // master toggle for this call
    discovery: "tool", // override the instance discovery mode
    scopeId: "channel-123", // include skills scoped to this id
    tags: ["payments"], // restrict the listing to these tags
    preload: ["deploy_sop"], // activate up front, no model round-trip
  },
});
```

`preload` activates skills before the model runs: instructions are injected into the call's system prompt and pinned to the session like a normal activation. Use it when the host already knows which skill applies (e.g. a channel bound to a runbook).

## Built-in Tools

| Tool                                             | Injected                         | Purpose                                                                              |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------ |
| `use_skill`                                      | per call                         | Load a skill's full instructions by exact name; returns `already_loaded` when active |
| `read_skill_resource`                            | per call                         | Read a bundled resource file of a loaded skill                                       |
| `list_skills`                                    | registered                       | Lightweight catalog for "what can you do?" questions                                 |
| `skill_create` / `skill_update` / `skill_delete` | registered when `allowMutations` | Model-proposed mutations, gated by `onMutationRequest`                               |

## Storage Backends

```typescript
// In-process (tests, embedded)
storage: { type: "memory", skills: [...], resources: { "skill-id": { "references/x.md": "…" } } }

// Filesystem (CLI, local development)
storage: { type: "filesystem", path: "./skills" }

// S3 (production, curator-compatible layout)
storage: { type: "s3", bucket: "my-bucket", prefix: "team-skills/" }

// Redis (shared store on the pooled core client, no TTL)
storage: { type: "redis", url: process.env.REDIS_URL }

// Anything else
storage: { type: "custom", store: mySkillStore }
```

Resource layouts per backend:

- **Filesystem** — sibling files of `SKILL.md` (see above)
- **S3** — `<prefix>skills/<id>.json` for the skill, `<prefix>skills/<id>/<path>` for resources; `<prefix>index.json` is self-healing and refreshed with ETag-conditional reads (an unchanged index costs a 304, not a download)
- **Redis** — `<keyPrefix><id>` for skills, `<keyPrefix>__resources__:<id>:<path>` for resources (the `__resources__:` segment is reserved and excluded from the index scan)
- **Custom** — implement the optional `getResource(id, path)` on your `SkillStore`

S3 requires the optional peer `@aws-sdk/client-s3`. A custom store implements `get(id)`, `put(skill)`, `delete(id)`, `index()` (index entries must be cheap — they back every listing), plus optionally `getResource` and `invalidate`.

## Mutations & Approval Gate

```typescript
const neurolink = new NeuroLink({
  skills: {
    enabled: true,
    storage: { type: "s3", bucket: "team-skills" },
    allowMutations: true,
    onMutationRequest: async (action) => {
      const ticket = await sendToSlackApproval(action);
      return { outcome: "pending", reference: ticket };
    },
  },
});
```

- Reads **fail open** (errors → empty results + warn log); writes **fail closed**.
- Deletes are soft — deprecated skills stop matching but stay in storage for audit.
- Updates bump `version`; active sessions keep the version they loaded.

## Observability

Every activation stamps the active span with `skill.name`, `skill.version`, `skill.instructions_chars`, and `skill.pinned`, so traces show exactly which skills a turn loaded and what they cost.

## CLI

```bash
neurolink skills list --skills-dir ./skills
neurolink skills show refund_dispute_escalation
neurolink skills search "refund" --tag payments
neurolink skills create --name deploy_sop --description "How to deploy" --instructions-file ./sop.md
neurolink skills delete deploy_sop

# Make skills available to a run
neurolink generate "how do I deploy?" --skills-dir ./skills
```

`NEUROLINK_SKILLS_DIR` works as an alternative to `--skills-dir`.

## Server

`/api/agent/skills` exposes CRUD routes when the server's NeuroLink instance has skills configured (503 `SKILLS_UNAVAILABLE` otherwise); mutation routes additionally require `allowMutations: true`.

## Config Reference

| Key                   | Default              | Purpose                                                                |
| --------------------- | -------------------- | ---------------------------------------------------------------------- |
| `enabled`             | —                    | Master switch (required)                                               |
| `storage`             | `{ type: "memory" }` | Persistence backend                                                    |
| `discovery`           | `"tool"`             | Where the listing surfaces (`"tool"` \| `"system-prompt"` \| `"none"`) |
| `listingBudgetChars`  | `15000`              | Character budget for the `"tool"` listing                              |
| `sessionPersistence`  | `true`               | Pin activated instructions into session history                        |
| `maxMatches`          | `5`                  | Max skills hydrated per programmatic `search()`                        |
| `promptIndexMaxItems` | `50`                 | Max entries in the `"system-prompt"` index                             |
| `indexCacheTtlMs`     | `30000`              | Index cache TTL (0 disables)                                           |
| `defaultScopeId`      | —                    | Scope filter applied when a call provides none                         |
| `allowMutations`      | `false`              | Register the `skill_*` mutation tools                                  |
| `onMutationRequest`   | —                    | Host approval gate for mutations                                       |

## Programmatic Access

```typescript
const manager = neurolink.getSkillsManager();
const all = await manager?.list();
const matches = await manager?.search({ query: "refund", limit: 3 });
const skill = await manager?.get("refund_dispute_escalation");
const resource = await manager?.getResource(
  skill!.id,
  "references/edge-cases.md",
);
```
