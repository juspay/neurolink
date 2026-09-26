[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierDecideFn

# Type Alias: ClassifierDecideFn

> **ClassifierDecideFn** = [`DecisionCallerFn`](DecisionCallerFn.md)

Injected decision caller — typically a bound `NeuroLink.tryDecide`, which
returns null on any failure. Keeps `ClassifierRouter` free of provider
imports, exactly as `ClassifierGenerateFn` does.
