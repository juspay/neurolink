[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouterInputContext

# Type Alias: RouterInputContext

> **RouterInputContext** = `object`

Lightweight characteristics of the incoming request available to the router
without executing the full call.

## Properties

### prompt

> **prompt**: `string`

The text prompt (or first text segment of a multi-modal input).

---

### estimatedInputTokens?

> `optional` **estimatedInputTokens?**: `number`

Rough token estimate for the input, if known by the caller.

---

### hasTools?

> `optional` **hasTools?**: `boolean`

True when the call includes at least one tool definition.

---

### requiresVision?

> `optional` **requiresVision?**: `boolean`

True when the call includes at least one image/vision attachment.

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `string`

Thinking level passed to the call ("minimal" | "low" | "medium" | "high").
