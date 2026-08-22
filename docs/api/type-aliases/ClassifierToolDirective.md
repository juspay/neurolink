[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierToolDirective

# Type Alias: ClassifierToolDirective

> **ClassifierToolDirective** = `object`

Defined in: [types/classifierRouter.ts:99](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L99)

Per-difficulty tool policy applied to the request.

## Properties

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/classifierRouter.ts:101](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L101)

Allowlist of tool names to keep (maps to `options.toolFilter`).

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/classifierRouter.ts:103](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L103)

Denylist of tool names to drop (appended to `options.excludeTools`).
