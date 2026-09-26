[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrepareStepResult

# Type Alias: PrepareStepResult\<TOOLS\>

> **PrepareStepResult**\<`TOOLS`\> = `object`

## Type Parameters

### TOOLS

`TOOLS` _extends_ `Record`\<`string`, [`Tool`](Tool.md)\> = `Record`\<`string`, [`Tool`](Tool.md)\>

## Properties

### model?

> `optional` **model?**: [`LanguageModel`](LanguageModel.md)

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`TOOLS`\>

---

### activeTools?

> `optional` **activeTools?**: keyof `TOOLS`[]

---

### system?

> `optional` **system?**: `string`

---

### messages?

> `optional` **messages?**: [`ModelMessage`](ModelMessage.md)[]

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>

---

### tools?

> `optional` **tools?**: `TOOLS`
