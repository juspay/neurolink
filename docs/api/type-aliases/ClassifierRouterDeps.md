[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDeps

# Type Alias: ClassifierRouterDeps

> **ClassifierRouterDeps** = `object`

Defined in: [types/classifierRouter.ts:214](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L214)

Injected dependencies — keep `ClassifierRouter` provider-import-free and
unit-testable (mirrors the `toolRouting` generateFn-injection pattern).

## Properties

### generate?

> `optional` **generate?**: [`ClassifierGenerateFn`](ClassifierGenerateFn.md)

Defined in: [types/classifierRouter.ts:216](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L216)

LLM caller for the "llm" strategy. Omit to disable LLM classification.

---

### logger?

> `optional` **logger?**: [`ClassifierLogger`](ClassifierLogger.md)

Defined in: [types/classifierRouter.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/classifierRouter.ts#L217)
