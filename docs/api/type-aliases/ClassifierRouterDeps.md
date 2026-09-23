[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDeps

# Type Alias: ClassifierRouterDeps

> **ClassifierRouterDeps** = `object`

Defined in: [types/classifierRouter.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L379)

Injected dependencies — keep `ClassifierRouter` provider-import-free and
unit-testable (mirrors the `toolRouting` generateFn-injection pattern).

## Properties

### generate?

> `optional` **generate?**: [`ClassifierGenerateFn`](ClassifierGenerateFn.md)

Defined in: [types/classifierRouter.ts:381](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L381)

LLM caller for the "llm" strategy. Omit to disable LLM classification.

---

### decide?

> `optional` **decide?**: [`ClassifierDecideFn`](ClassifierDecideFn.md)

Defined in: [types/classifierRouter.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L383)

Decision caller for the "jev" strategy. Omit to disable it.

---

### logger?

> `optional` **logger?**: [`ClassifierLogger`](ClassifierLogger.md)

Defined in: [types/classifierRouter.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L384)
