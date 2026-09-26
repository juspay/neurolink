[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DefaultRequestRouterConfig

# Type Alias: DefaultRequestRouterConfig

> **DefaultRequestRouterConfig** = `object`

Configuration for the built-in heuristic request router produced by
`createDefaultRequestRouter`. All fields are optional; sensible defaults
apply when omitted.

## Properties

### largeInputTokenThreshold?

> `optional` **largeInputTokenThreshold?**: `number`

Token threshold above which the "large" tier is selected.
Default: 32_000.

---

### visionTier?

> `optional` **visionTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Provider/model to use for vision requests.

---

### largeTier?

> `optional` **largeTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Provider/model to use for large inputs or tool-heavy requests.

---

### smallTier?

> `optional` **smallTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Provider/model to use for fast/small requests.
