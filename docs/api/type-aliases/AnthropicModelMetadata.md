[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicModelMetadata

# Type Alias: AnthropicModelMetadata

> **AnthropicModelMetadata** = `object`

Defined in: [types/subscription.ts:1051](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1051)

Model metadata definition for Anthropic models

## Properties

### displayName

> **displayName**: `string`

Defined in: [types/subscription.ts:1053](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1053)

Human-readable display name

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:1055](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1055)

Maximum context window size in tokens

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:1057](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1057)

Maximum output tokens

---

### supportsVision

> **supportsVision**: `boolean`

Defined in: [types/subscription.ts:1059](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1059)

Whether the model supports vision/image input

---

### supportsExtendedThinking

> **supportsExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:1061](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1061)

Whether the model supports extended thinking mode

---

### supportsToolUse

> **supportsToolUse**: `boolean`

Defined in: [types/subscription.ts:1063](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1063)

Whether the model supports tool/function calling

---

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/subscription.ts:1065](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1065)

Whether the model supports streaming

---

### deprecated

> **deprecated**: `boolean`

Defined in: [types/subscription.ts:1067](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1067)

Whether the model is deprecated

---

### family

> **family**: `"haiku"` \| `"sonnet"` \| `"opus"`

Defined in: [types/subscription.ts:1069](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1069)

Model family (haiku, sonnet, opus)

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:1071](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1071)

Short description of the model
