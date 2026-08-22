[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelPoolConfig

# Type Alias: ModelPoolConfig

> **ModelPoolConfig** = `object`

Defined in: [types/modelPool.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L36)

Constructor-level configuration for a ModelPool instance.

## Properties

### members

> **members**: [`ModelPoolMember`](ModelPoolMember.md)[]

Defined in: [types/modelPool.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L38)

Ordered list of provider/model/region candidates.

---

### strategy?

> `optional` **strategy?**: [`ModelPoolStrategy`](ModelPoolStrategy.md)

Defined in: [types/modelPool.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L45)

How to pick among available members.

- "priority" — always try the first available member (default).
- "round-robin" — rotate through members in order.
- "weighted" — prefer members with higher weight, varies by cursor.

---

### cooldownMs?

> `optional` **cooldownMs?**: `number`

Defined in: [types/modelPool.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L51)

How long (ms) a failed member stays in cooldown before it is eligible
again. Applies to retryable error classes (rate_limit, server, network).
Default: 60_000 (1 minute).

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/modelPool.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/modelPool.ts#L56)

Maximum total attempts across all pool members per call.
Default: members.length (try every member once).
