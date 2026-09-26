[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JudgeConfig

# Type Alias: JudgeConfig

> **JudgeConfig** = `object`

Judge model configuration
NOTE: Testing phase uses fixed 0-100 scoring scale

## Properties

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

---

### model

> **model**: `string`

---

### criteria

> **criteria**: `string`[]

---

### outputFormat

> **outputFormat**: [`JudgeOutputFormat`](JudgeOutputFormat.md)

---

### customPrompt?

> `optional` **customPrompt?**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### timeout?

> `optional` **timeout?**: `number`

---

### blindEvaluation?

> `optional` **blindEvaluation?**: `boolean`

---

### includeReasoning

> **includeReasoning**: `boolean`

---

### synthesizeImprovedResponse?

> `optional` **synthesizeImprovedResponse?**: `boolean`

---

### scoreScale

> **scoreScale**: `object`

#### min

> **min**: `0`

#### max

> **max**: `100`

---

### label?

> `optional` **label?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
