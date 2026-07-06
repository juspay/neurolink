---
title: Skills Guide
description: Native skills — versioned, discoverable instruction packs (SOPs, playbooks) with progressive disclosure via built-in tools and a system-prompt index
keywords:
  [
    skills,
    sops,
    playbooks,
    progressive-disclosure,
    search_skills,
    list_skills,
    skill-tools,
    maker-checker,
    custom-storage,
  ]
---

# Skills Guide

> **Since**: v9.82.0 | **Status**: New | **Availability**: SDK

## Overview

NeuroLink includes native **skills** support: versioned, discoverable instruction packs (SOPs, playbooks, workflows) that agents consult before answering from general knowledge. Skills use **progressive disclosure** to stay cheap:

- A compact **index** (name + description, never instructions) is injected into the system prompt of each `generate()`/`stream()` call, so the model knows what exists.
- Full **instructions** are loaded on demand through the built-in `search_skills` tool — only for skills that actually match the user's request.

This is the same architecture proven in production by curator's skills system, generalized and moved into the SDK: enable it with one config block instead of building stores, matchers, and tools in app code.

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  skills: {
    enabled: true,
    storage: { type: "filesystem", path: "./skills" },
  },
});

// The model now sees the skills index in its system prompt and can call
// search_skills / list_skills automatically during any generate/stream.
const result = await neurolink.generate({
  input: { text: "A refund is disputed — how do I escalate?" },
});
```

## Skill Format

Three on-disk layouts are supported by the filesystem store (mixable in one directory):

**JSON** (`./skills/<id>.json`):

```json
{
  "id": "refund-escalation",
  "name": "refund_dispute_escalation",
  "displayName": "Refund Dispute Escalation",
  "description": "How to escalate a disputed refund to the payments on-call team.",
  "instructions": "1. Collect the transaction id.\n2. Verify the dispute.\n3. Page payments-oncall.",
  "tags": ["payments", "escalation"]
}
```

**Frontmatter markdown** (`./skills/<name>.md`):

```markdown
---
name: oncall_handover
description: Checklist for handing over the on-call shift.
tags: [devops, oncall]
---

1. Summarize open incidents.
2. Hand over the pager.
```

**Claude-skills directory layout** (`./skills/<name>/SKILL.md`) — same frontmatter format, interoperable with Claude-style skill directories.

Optional fields: `scope: "scoped"` + `scopeIds: [...]` restrict a skill to specific scopes (channels/teams/tenants); `status: "deprecated"` hides it from matching.

## Storage Backends

| Type         | Config                                    | Use case                                     |
| ------------ | ----------------------------------------- | -------------------------------------------- |
| `memory`     | `{ type: "memory", skills?: [...] }`      | Tests, embedded, host-managed                |
| `filesystem` | `{ type: "filesystem", path: "./dir" }`   | Local dev, git-versioned skill repos         |
| `s3`         | `{ type: "s3", bucket, prefix? }`         | Shared team skills (curator-style)           |
| `redis`      | `{ type: "redis", keyPrefix? }`           | Low-latency shared store, reuses core client |
| `custom`     | `{ type: "custom", store: mySkillStore }` | Anything else — implement `SkillStore`       |

A custom store implements four methods: `get(id)`, `put(skill)`, `delete(id)`, `index()` (index entries must be cheap — they back every search).

### S3

```typescript
skills: {
  enabled: true,
  storage: {
    type: "s3",
    bucket: "team-skills",
    prefix: "tara/",          // default "neurolink-skills/"
    region: "us-east-1",
    // endpoint + forcePathStyle for MinIO/LocalStack;
    // credentials default to the standard AWS provider chain
  },
}
```

Layout: `<prefix>skills/<id>.json` per skill plus a `<prefix>index.json` that is upserted on writes and **rebuilt automatically from a bucket listing** when missing or corrupt. The AWS SDK is an optional peer — install `@aws-sdk/client-s3` in your app (NeuroLink core does not depend on it; without it, S3-configured skills fail open with an actionable error).

### Redis

```typescript
skills: {
  enabled: true,
  storage: { type: "redis", keyPrefix: "neurolink:skills:" },
  // url / host / port / password / db — defaults match the core Redis client
}
```

Uses NeuroLink's pooled Redis client (`redis` v5, already a core dependency — shared with Redis conversation memory). One JSON value per skill; the index is derived with SCAN + MGET. Skills are persistent — no TTL.

## Built-in Tools

When enabled, these tools are auto-registered and reach the model on every call:

- **`search_skills`** — index-first search by `query` and/or `tag`; hydrates at most `maxMatches` (default 5) matching skills with full instructions. A zero-match result returns `{ skills: [], reason: "no_match" }` as a **success**, telling the model to fall back to general knowledge.
- **`list_skills`** — lightweight discovery listing (no instructions), for "what can you do?" questions.

With `allowMutations: true`, three more tools are registered:

- **`skill_create`**, **`skill_update`**, **`skill_delete`** — propose changes, routed through your `onMutationRequest` gate when configured. Deletes are soft (status becomes `deprecated`).

## Approval Gate (Maker-Checker)

Hosts keep full control over writes via `onMutationRequest`:

```typescript
const neurolink = new NeuroLink({
  skills: {
    enabled: true,
    storage: { type: "custom", store: s3SkillsStore },
    allowMutations: true,
    onMutationRequest: async (action) => {
      // e.g. post a Slack approval block, persist a pending action…
      const ticket = await queueForApproval(action);
      return { outcome: "pending", reference: ticket.id };
      // or { outcome: "approved" } to apply immediately
      // or { outcome: "rejected", reason: "…" } to block
    },
  },
});
```

`"pending"` means the host applies the change itself after human approval — NeuroLink writes nothing.

## Configuration Reference

```typescript
skills: {
  enabled: true,
  storage: { type: "filesystem", path: "./skills" },
  promptIndex: true,        // inject index into system prompt (default true)
  promptIndexMaxItems: 50,  // truncate the injected index
  maxMatches: 5,            // max skills hydrated per search
  indexCacheTtlMs: 30_000,  // index cache TTL (0 = no caching)
  defaultScopeId: undefined, // default scope filter
  allowMutations: false,    // register skill_create/update/delete
  onMutationRequest: undefined, // approval gate
}
```

### Per-call options

```typescript
await neurolink.generate({
  input: { text: "…" },
  skills: {
    enabled: true, // per-call master toggle (prompt index)
    promptIndex: false, // disable injection for this call only
    scopeId: "team-alpha", // scope the index for this call
    tags: ["payments"], // narrow the index by tags
  },
});
```

### Programmatic access

```typescript
const manager = neurolink.getSkillsManager();
const matches = await manager?.search({ query: "refund" });
const index = await manager?.list();
await manager?.requestMutation({ type: "create", skill: { … } });
```

## CLI

Manage a filesystem skills store directly:

```bash
neurolink skills list   --skills-dir ./skills
neurolink skills show   refund_dispute_escalation --skills-dir ./skills
neurolink skills search "refund" --skills-dir ./skills
neurolink skills create --skills-dir ./skills \
  --name deploy_sop --description "How to deploy" --instructions-file ./sop.md
neurolink skills delete deploy_sop --skills-dir ./skills
```

Make skills available to any generation run with the same flag (or `NEUROLINK_SKILLS_DIR`):

```bash
neurolink generate "A refund is disputed — how do I escalate?" --skills-dir ./skills
neurolink loop --skills-dir ./skills
```

Directory precedence: `--skills-dir` > `NEUROLINK_SKILLS_DIR` > `./skills` (for the `skills` command group).

## Server Endpoints

When the server's NeuroLink instance has skills enabled, these routes are available:

| Method   | Path                    | Purpose                                   |
| -------- | ----------------------- | ----------------------------------------- |
| `GET`    | `/api/agent/skills`     | List index entries (optional `?scopeId=`) |
| `GET`    | `/api/agent/skills/:id` | One skill with instructions (id or name)  |
| `POST`   | `/api/agent/skills`     | Create (routed through the mutation gate) |
| `PATCH`  | `/api/agent/skills/:id` | Update (patch semantics, version bump)    |
| `DELETE` | `/api/agent/skills/:id` | Soft-delete (deprecate)                   |

Mutation endpoints honor `onMutationRequest` — a `pending` decision returns `{ decision: { outcome: "pending", reference } }` without writing. When skills are not configured the routes return a 503 `SKILLS_UNAVAILABLE` error envelope. Authenticated user identity (when auth middleware is active) overrides caller-supplied `requestedBy`.

## Behavior Notes

- **Opt-in and fail-open**: with no `skills` config, nothing changes. Store/read errors log a warning and degrade to "no skills" — they never fail a generate/stream call. Mutations fail closed.
- **Media modes**: the prompt index is skipped for avatar/music/video/ppt outputs (no meaningful text prompt to augment).
- **Tool routing**: skill tools are registered as custom (direct) tools, so server-granularity tool routing never drops them.
- Related: [Memory Guide](/docs/features/memory) for the analogous per-user memory subsystem, and [Conversation History](/docs/features/conversation-history).

## Testing

```bash
pnpm run test:skills   # test/continuous-test-suite-skills.ts (mostly no-API; live test skips without credentials)
```
