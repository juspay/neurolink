[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentToolRegistrationOptions

# Type Alias: AgentToolRegistrationOptions

> **AgentToolRegistrationOptions** = `object`

Defined in: [types/isolatedAgent.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L467)

Options for `NeuroLink.registerAgentTool()` — wraps an isolated agent as a
tool on the HOST instance so its existing generate() loop delegates
without a second router generate.

## Properties

### name?

> `optional` **name?**: `string`

Defined in: [types/isolatedAgent.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L469)

Tool name (default: the agent definition id).

---

### maxDelegationsPerTurn?

> `optional` **maxDelegationsPerTurn?**: `number`

Defined in: [types/isolatedAgent.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L475)

Max delegations to this tool per top-level generate() turn, counted in
the loop itself. A refused call returns a recovery instruction, never a
silent failure.

---

### maxDepth?

> `optional` **maxDepth?**: `number`

Defined in: [types/isolatedAgent.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L480)

Max delegation depth (via tool context `agentDepth`). At the limit the
tool is withheld from the request entirely.

---

### maxConcurrent?

> `optional` **maxConcurrent?**: `number`

Defined in: [types/isolatedAgent.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L489)

Process-wide concurrent delegation pool size. The pool is shared across
all registered agent tools; the largest registered value wins (default 4) — registering raises the pool and can never lower it, so this is NOT
a per-agent throttle. Nested delegations (agentDepth > 0) bypass the
pool: the outer delegation already holds a slot, and queueing nested
work behind a full pool would deadlock it.

---

### poolQueueTimeoutMs?

> `optional` **poolQueueTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L491)

Queue timeout when the pool is saturated (ms, default 30_000).

---

### leg?

> `optional` **leg?**: [`AgentLegOptions`](AgentLegOptions.md)

Defined in: [types/isolatedAgent.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L493)

Leashed-by-default leg budget for this tool.

---

### handleTtlMs?

> `optional` **handleTtlMs?**: `number`

Defined in: [types/isolatedAgent.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L495)

Handle TTL for leashed delegations (ms, default 600_000).

---

### waste?

> `optional` **waste?**: [`AgentWasteThresholds`](AgentWasteThresholds.md)

Defined in: [types/isolatedAgent.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L497)

Waste thresholds forwarded to each delegated run.

---

### overrides?

> `optional` **overrides?**: [`AgentRunOverrides`](AgentRunOverrides.md)

Defined in: [types/isolatedAgent.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L499)

Per-run overrides forwarded to each delegated run.
