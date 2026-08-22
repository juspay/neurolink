[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicModelMetadata

# Type Alias: AnthropicModelMetadata

> **AnthropicModelMetadata** = `object`

Defined in: [types/subscription.ts:1133](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1133)

Model metadata definition for Anthropic models

## Properties

### displayName

> **displayName**: `string`

Defined in: [types/subscription.ts:1135](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1135)

Human-readable display name

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:1137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1137)

Maximum context window size in tokens

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:1139](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1139)

Maximum output tokens

---

### supportsVision

> **supportsVision**: `boolean`

Defined in: [types/subscription.ts:1141](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1141)

Whether the model supports vision/image input

---

### supportsExtendedThinking

> **supportsExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:1143](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1143)

Whether the model supports extended thinking mode

---

### supportsToolUse

> **supportsToolUse**: `boolean`

Defined in: [types/subscription.ts:1145](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1145)

Whether the model supports tool/function calling

---

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/subscription.ts:1147](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1147)

Whether the model supports streaming

---

### deprecated

> **deprecated**: `boolean`

Defined in: [types/subscription.ts:1149](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1149)

Whether the model is deprecated

---

### family

> **family**: `"haiku"` \| `"sonnet"` \| `"opus"`

Defined in: [types/subscription.ts:1151](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1151)

Model family (haiku, sonnet, opus)

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:1153](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1153)

Short description of the model
