[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowModelConfig

# Type Alias: WorkflowModelConfig

> **WorkflowModelConfig** = `object`

Model configuration for ensemble
Named WorkflowModelConfig to avoid conflict with modelTypes.ModelConfig

## Properties

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

---

### model

> **model**: `string`

---

### weight?

> `optional` **weight?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### timeout?

> `optional` **timeout?**: `number`

---

### topP?

> `optional` **topP?**: `number`

---

### topK?

> `optional` **topK?**: `number`

---

### presencePenalty?

> `optional` **presencePenalty?**: `number`

---

### frequencyPenalty?

> `optional` **frequencyPenalty?**: `number`

---

### label?

> `optional` **label?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
