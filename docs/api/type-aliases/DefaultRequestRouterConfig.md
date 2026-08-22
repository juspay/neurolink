[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DefaultRequestRouterConfig

# Type Alias: DefaultRequestRouterConfig

> **DefaultRequestRouterConfig** = `object`

Defined in: [types/requestRouter.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L70)

Configuration for the built-in heuristic request router produced by
`createDefaultRequestRouter`. All fields are optional; sensible defaults
apply when omitted.

## Properties

### largeInputTokenThreshold?

> `optional` **largeInputTokenThreshold?**: `number`

Defined in: [types/requestRouter.ts:75](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L75)

Token threshold above which the "large" tier is selected.
Default: 32_000.

---

### visionTier?

> `optional` **visionTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Defined in: [types/requestRouter.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L77)

Provider/model to use for vision requests.

---

### largeTier?

> `optional` **largeTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Defined in: [types/requestRouter.ts:79](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L79)

Provider/model to use for large inputs or tool-heavy requests.

---

### smallTier?

> `optional` **smallTier?**: [`ModelTierEntry`](ModelTierEntry.md)

Defined in: [types/requestRouter.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/requestRouter.ts#L81)

Provider/model to use for fast/small requests.
