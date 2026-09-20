[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDecision

# Type Alias: ClassifierRouterDecision

> **ClassifierRouterDecision** = `object`

Defined in: [types/classifierRouter.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L285)

The router's combined decision: a provider/model/region override plus an
optional tool narrowing. Any undefined field means "keep what the caller
already configured". Returning `null` from the router is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/classifierRouter.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L286)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L287)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L288)

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/classifierRouter.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L290)

Allowlist applied to `options.toolFilter`.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/classifierRouter.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L292)

Denylist appended to `options.excludeTools`.

---

### difficulty?

> `optional` **difficulty?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

Defined in: [types/classifierRouter.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L294)

The difficulty this decision was made for (debug/telemetry).

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/classifierRouter.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L306)

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

Defined in: [types/classifierRouter.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L308)

The scope reading `compactionThreshold` was derived from.

---

### modelFallbacks?

> `optional` **modelFallbacks?**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L310)

Remaining ranked candidates, best-first, for downstream failover.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/classifierRouter.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L312)

Human-readable explanation, emitted at debug level.
