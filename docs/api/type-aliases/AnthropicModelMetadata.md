[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicModelMetadata

# Type Alias: AnthropicModelMetadata

> **AnthropicModelMetadata** = `object`

Defined in: [types/subscription.ts:1134](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1134)

Model metadata definition for Anthropic models

## Properties

### displayName

> **displayName**: `string`

Defined in: [types/subscription.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1136)

Human-readable display name

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1138)

Maximum context window size in tokens

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1140)

Maximum output tokens

---

### supportsVision

> **supportsVision**: `boolean`

Defined in: [types/subscription.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1142)

Whether the model supports vision/image input

---

### supportsExtendedThinking

> **supportsExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1144)

Whether the model supports extended thinking mode

---

### supportsToolUse

> **supportsToolUse**: `boolean`

Defined in: [types/subscription.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1146)

Whether the model supports tool/function calling

---

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/subscription.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1148)

Whether the model supports streaming

---

### deprecated

> **deprecated**: `boolean`

Defined in: [types/subscription.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1150)

Whether the model is deprecated

---

### family

> **family**: `"haiku"` \| `"sonnet"` \| `"opus"`

Defined in: [types/subscription.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1152)

Model family (haiku, sonnet, opus)

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1154)

Short description of the model
