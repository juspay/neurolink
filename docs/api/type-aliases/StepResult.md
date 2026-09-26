[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepResult

# Type Alias: StepResult\<TOOLS\>

> **StepResult**\<`TOOLS`\> = `object`

## Type Parameters

### TOOLS

`TOOLS` _extends_ [`ToolSet`](ToolSet.md) = [`ToolSet`](ToolSet.md)

## Properties

### stepNumber?

> `readonly` `optional` **stepNumber?**: `number`

---

### content

> `readonly` **content**: `object` & `Record`\<`string`, `unknown`\>[]

---

### text

> `readonly` **text**: `string`

---

### reasoning?

> `readonly` `optional` **reasoning?**: `unknown`

---

### reasoningText?

> `readonly` `optional` **reasoningText?**: `string`

---

### files?

> `readonly` `optional` **files?**: `unknown`[]

---

### sources?

> `readonly` `optional` **sources?**: `unknown`[]

---

### toolCalls

> `readonly` **toolCalls**: `object` & `Record`\<`string`, `unknown`\>[]

---

### toolResults

> `readonly` **toolResults**: `object` & `Record`\<`string`, `unknown`\>[]

---

### stepType?

> `readonly` `optional` **stepType?**: `string`

---

### finishReason

> `readonly` **finishReason**: [`FinishReason`](FinishReason.md)

---

### rawFinishReason?

> `readonly` `optional` **rawFinishReason?**: `string`

---

### usage

> `readonly` **usage**: [`LanguageModelUsage`](LanguageModelUsage.md)

---

### warnings?

> `readonly` `optional` **warnings?**: `unknown`[]

---

### request?

> `readonly` `optional` **request?**: [`LanguageModelRequestMetadata`](LanguageModelRequestMetadata.md)

---

### response?

> `readonly` `optional` **response?**: [`LanguageModelResponseMetadata`](LanguageModelResponseMetadata.md) & `object`

#### Type Declaration

##### messages

> **messages**: [`ModelMessage`](ModelMessage.md)[]

##### body?

> `optional` **body?**: `unknown`

---

### providerMetadata?

> `readonly` `optional` **providerMetadata?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

---

### tools?

> `readonly` `optional` **tools?**: `TOOLS`
