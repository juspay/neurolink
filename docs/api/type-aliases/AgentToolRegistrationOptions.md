[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentToolRegistrationOptions

# Type Alias: AgentToolRegistrationOptions

> **AgentToolRegistrationOptions** = `object`

Options for `NeuroLink.registerAgentTool()` — wraps an isolated agent as a
tool on the HOST instance so its existing generate() loop delegates
without a second router generate.

## Properties

### name?

> `optional` **name?**: `string`

Tool name (default: the agent definition id).

---

### maxDelegationsPerTurn?

> `optional` **maxDelegationsPerTurn?**: `number`

Max delegations to this tool per top-level generate() turn, counted in
the loop itself. A refused call returns a recovery instruction, never a
silent failure.

---

### maxDepth?

> `optional` **maxDepth?**: `number`

Max delegation depth (via tool context `agentDepth`). At the limit the
tool is withheld from the request entirely.

---

### maxConcurrent?

> `optional` **maxConcurrent?**: `number`

Process-wide concurrent delegation pool size. The pool is shared across
all registered agent tools; the largest registered value wins (default 4) — registering raises the pool and can never lower it, so this is NOT
a per-agent throttle. Nested delegations (agentDepth > 0) bypass the
pool: the outer delegation already holds a slot, and queueing nested
work behind a full pool would deadlock it.

---

### poolQueueTimeoutMs?

> `optional` **poolQueueTimeoutMs?**: `number`

Queue timeout when the pool is saturated (ms, default 30_000).

---

### leg?

> `optional` **leg?**: [`AgentLegOptions`](AgentLegOptions.md)

Leashed-by-default leg budget for this tool.

---

### handleTtlMs?

> `optional` **handleTtlMs?**: `number`

Handle TTL for leashed delegations (ms, default 600_000).

---

### waste?

> `optional` **waste?**: [`AgentWasteThresholds`](AgentWasteThresholds.md)

Waste thresholds forwarded to each delegated run.

---

### overrides?

> `optional` **overrides?**: [`AgentRunOverrides`](AgentRunOverrides.md)

Per-run overrides forwarded to each delegated run.
