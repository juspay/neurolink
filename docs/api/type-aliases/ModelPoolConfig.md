[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelPoolConfig

# Type Alias: ModelPoolConfig

> **ModelPoolConfig** = `object`

Constructor-level configuration for a ModelPool instance.

## Properties

### members

> **members**: [`ModelPoolMember`](ModelPoolMember.md)[]

Ordered list of provider/model/region candidates.

---

### strategy?

> `optional` **strategy?**: [`ModelPoolStrategy`](ModelPoolStrategy.md)

How to pick among available members.

- "priority" — always try the first available member (default).
- "round-robin" — rotate through members in order.
- "weighted" — prefer members with higher weight, varies by cursor.

---

### cooldownMs?

> `optional` **cooldownMs?**: `number`

How long (ms) a failed member stays in cooldown before it is eligible
again. Applies to retryable error classes (rate_limit, server, network).
Default: 60_000 (1 minute).

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Maximum total attempts across all pool members per call.
Default: members.length (try every member once).
