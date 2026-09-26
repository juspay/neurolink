[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicModelMetadata

# Type Alias: AnthropicModelMetadata

> **AnthropicModelMetadata** = `object`

Model metadata definition for Anthropic models

## Properties

### displayName

> **displayName**: `string`

Human-readable display name

---

### contextWindow

> **contextWindow**: `number`

Maximum context window size in tokens

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Maximum output tokens

---

### supportsVision

> **supportsVision**: `boolean`

Whether the model supports vision/image input

---

### supportsExtendedThinking

> **supportsExtendedThinking**: `boolean`

Whether the model supports extended thinking mode

---

### supportsToolUse

> **supportsToolUse**: `boolean`

Whether the model supports tool/function calling

---

### supportsStreaming

> **supportsStreaming**: `boolean`

Whether the model supports streaming

---

### deprecated

> **deprecated**: `boolean`

Whether the model is deprecated

---

### family

> **family**: `"haiku"` \| `"sonnet"` \| `"opus"`

Model family (haiku, sonnet, opus)

---

### description

> **description**: `string`

Short description of the model
