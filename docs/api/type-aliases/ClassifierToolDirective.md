[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierToolDirective

# Type Alias: ClassifierToolDirective

> **ClassifierToolDirective** = `object`

Per-difficulty tool policy applied to the request.

## Properties

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Allowlist of tool names to keep (maps to `options.toolFilter`).

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Denylist of tool names to drop (appended to `options.excludeTools`).
