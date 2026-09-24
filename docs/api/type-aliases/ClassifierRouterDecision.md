[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDecision

# Type Alias: ClassifierRouterDecision

> **ClassifierRouterDecision** = `object`

Defined in: [types/classifierRouter.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L289)

The router's combined decision: a provider/model/region override plus an
optional tool narrowing. Any undefined field means "keep what the caller
already configured". Returning `null` from the router is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/classifierRouter.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L290)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L291)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L292)

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/classifierRouter.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L294)

Allowlist applied to `options.toolFilter`.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/classifierRouter.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L296)

Denylist appended to `options.excludeTools`.

---

### difficulty?

> `optional` **difficulty?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

Defined in: [types/classifierRouter.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L298)

The difficulty this decision was made for (debug/telemetry).

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/classifierRouter.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L310)

Fraction of the model's window at which compaction should trigger for
THIS request, replacing the fixed 0.8 default.

**Only ever lower than the default, never higher.** Raising it would let
a request through that the model then rejects with a context-window
error — and `ModelPool` treats that as a permanent cooldown (10 years),
so a single optimistic guess retires the model for the life of the
process. Shrinking a budget wastes a little context; growing one is
unrecoverable.

---

### contextScope?

> `optional` **contextScope?**: [`ClassifierContextScope`](ClassifierContextScope.md)

Defined in: [types/classifierRouter.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L312)

The scope reading `compactionThreshold` was derived from.

---

### modelFallbacks?

> `optional` **modelFallbacks?**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L314)

Remaining ranked candidates, best-first, for downstream failover.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/classifierRouter.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L316)

Human-readable explanation, emitted at debug level.
