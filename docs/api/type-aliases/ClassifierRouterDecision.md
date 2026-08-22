[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDecision

# Type Alias: ClassifierRouterDecision

> **ClassifierRouterDecision** = `object`

Defined in: [types/classifierRouter.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L145)

The router's combined decision: a provider/model/region override plus an
optional tool narrowing. Any undefined field means "keep what the caller
already configured". Returning `null` from the router is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/classifierRouter.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L146)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L147)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L148)

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/classifierRouter.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L150)

Allowlist applied to `options.toolFilter`.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/classifierRouter.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L152)

Denylist appended to `options.excludeTools`.

---

### difficulty?

> `optional` **difficulty?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)

Defined in: [types/classifierRouter.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L154)

The difficulty this decision was made for (debug/telemetry).

---

### modelFallbacks?

> `optional` **modelFallbacks?**: [`ClassifierRouterPoolMember`](ClassifierRouterPoolMember.md)[]

Defined in: [types/classifierRouter.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L156)

Remaining ranked candidates, best-first, for downstream failover.

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/classifierRouter.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L158)

Human-readable explanation, emitted at debug level.
