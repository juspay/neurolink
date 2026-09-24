[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierDecideFn

# Type Alias: ClassifierDecideFn

> **ClassifierDecideFn** = [`DecisionCallerFn`](DecisionCallerFn.md)

Defined in: [types/classifierRouter.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L371)

Injected decision caller — typically a bound `NeuroLink.tryDecide`, which
returns null on any failure. Keeps `ClassifierRouter` free of provider
imports, exactly as `ClassifierGenerateFn` does.
