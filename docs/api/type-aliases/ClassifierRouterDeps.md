[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterDeps

# Type Alias: ClassifierRouterDeps

> **ClassifierRouterDeps** = `object`

Injected dependencies — keep `ClassifierRouter` provider-import-free and
unit-testable (mirrors the `toolRouting` generateFn-injection pattern).

## Properties

### generate?

> `optional` **generate?**: [`ClassifierGenerateFn`](ClassifierGenerateFn.md)

LLM caller for the "llm" strategy. Omit to disable LLM classification.

---

### decide?

> `optional` **decide?**: [`ClassifierDecideFn`](ClassifierDecideFn.md)

Decision caller for the "jev" strategy. Omit to disable it.

---

### hasDecisionProvider?

> `optional` **hasDecisionProvider?**: () => `boolean`

Whether a decision provider is configured for this caller, counting the
credentials it was given as well as the environment. Omit to check the
environment alone.

#### Returns

`boolean`

---

### logger?

> `optional` **logger?**: [`ClassifierLogger`](ClassifierLogger.md)
