[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouterInputContext

# Type Alias: RouterInputContext

> **RouterInputContext** = `object`

Defined in: [types/requestRouter.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L20)

Lightweight characteristics of the incoming request available to the router
without executing the full call.

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/requestRouter.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L22)

The text prompt (or first text segment of a multi-modal input).

---

### estimatedInputTokens?

> `optional` **estimatedInputTokens?**: `number`

Defined in: [types/requestRouter.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L24)

Rough token estimate for the input, if known by the caller.

---

### hasTools?

> `optional` **hasTools?**: `boolean`

Defined in: [types/requestRouter.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L26)

True when the call includes at least one tool definition.

---

### requiresVision?

> `optional` **requiresVision?**: `boolean`

Defined in: [types/requestRouter.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L28)

True when the call includes at least one image/vision attachment.

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `string`

Defined in: [types/requestRouter.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L30)

Thinking level passed to the call ("minimal" | "low" | "medium" | "high").
