[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDecision

# Type Alias: ClassifierRouterDecision

> **ClassifierRouterDecision** = `object`

The router's combined decision: a provider/model/region override plus an
optional tool narrowing. Any undefined field means "keep what the caller
already configured". Returning `null` from the router is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### region?

> `optional` **region?**: `string`

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Allowlist applied to `options.toolFilter`.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Denylist appended to `options.excludeTools`.

---

### difficulty?

> `optional` **difficulty?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

The difficulty this decision was made for (debug/telemetry).

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

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

The scope reading `compactionThreshold` was derived from.

---

### modelFallbacks?

> `optional` **modelFallbacks?**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Remaining ranked candidates, best-first, for downstream failover.

---

### reason?

> `optional` **reason?**: `string`

Human-readable explanation, emitted at debug level.
