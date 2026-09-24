[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDeps

# Type Alias: ClassifierRouterDeps

> **ClassifierRouterDeps** = `object`

Defined in: [types/classifierRouter.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L383)

Injected dependencies — keep `ClassifierRouter` provider-import-free and
unit-testable (mirrors the `toolRouting` generateFn-injection pattern).

## Properties

### generate?

> `optional` **generate?**: [`ClassifierGenerateFn`](ClassifierGenerateFn.md)

Defined in: [types/classifierRouter.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L385)

LLM caller for the "llm" strategy. Omit to disable LLM classification.

---

### decide?

> `optional` **decide?**: [`ClassifierDecideFn`](ClassifierDecideFn.md)

Defined in: [types/classifierRouter.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L387)

Decision caller for the "jev" strategy. Omit to disable it.

---

### hasDecisionProvider?

> `optional` **hasDecisionProvider?**: () => `boolean`

Defined in: [types/classifierRouter.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L393)

Whether a decision provider is configured for this caller, counting the
credentials it was given as well as the environment. Omit to check the
environment alone.

#### Returns

`boolean`

---

### logger?

> `optional` **logger?**: [`ClassifierLogger`](ClassifierLogger.md)

Defined in: [types/classifierRouter.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L394)
