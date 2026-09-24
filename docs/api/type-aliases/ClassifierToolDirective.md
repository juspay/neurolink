[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierToolDirective

# Type Alias: ClassifierToolDirective

> **ClassifierToolDirective** = `object`

Defined in: [types/classifierRouter.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L186)

Per-difficulty tool policy applied to the request.

## Properties

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/classifierRouter.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L188)

Allowlist of tool names to keep (maps to `options.toolFilter`).

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/classifierRouter.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L190)

Denylist of tool names to drop (appended to `options.excludeTools`).
