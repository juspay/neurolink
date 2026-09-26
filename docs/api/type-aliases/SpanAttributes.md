[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanAttributes

# Type Alias: SpanAttributes

> **SpanAttributes** = `object`

Span attributes with AI-specific fields

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### service.name?

> `optional` **service.name?**: `string`

---

### service.version?

> `optional` **service.version?**: `string`

---

### deployment.environment?

> `optional` **deployment.environment?**: `string`

---

### user.id?

> `optional` **user.id?**: `string`

---

### session.id?

> `optional` **session.id?**: `string`

---

### ai.provider?

> `optional` **ai.provider?**: `string`

---

### ai.model?

> `optional` **ai.model?**: `string`

---

### ai.model.version?

> `optional` **ai.model.version?**: `string`

---

### ai.tokens.input?

> `optional` **ai.tokens.input?**: `number`

---

### ai.tokens.output?

> `optional` **ai.tokens.output?**: `number`

---

### ai.tokens.total?

> `optional` **ai.tokens.total?**: `number`

---

### ai.tokens.cache_read?

> `optional` **ai.tokens.cache_read?**: `number`

---

### ai.tokens.cache_creation?

> `optional` **ai.tokens.cache_creation?**: `number`

---

### ai.tokens.reasoning?

> `optional` **ai.tokens.reasoning?**: `number`

---

### ai.cost.input?

> `optional` **ai.cost.input?**: `number`

---

### ai.cost.output?

> `optional` **ai.cost.output?**: `number`

---

### ai.cost.total?

> `optional` **ai.cost.total?**: `number`

---

### ai.cost.currency?

> `optional` **ai.cost.currency?**: `string`

---

### ai.temperature?

> `optional` **ai.temperature?**: `number`

---

### ai.max_tokens?

> `optional` **ai.max_tokens?**: `number`

---

### ai.top_p?

> `optional` **ai.top_p?**: `number`

---

### ai.stop_sequences?

> `optional` **ai.stop_sequences?**: `string`[]

---

### tool.name?

> `optional` **tool.name?**: `string`

---

### tool.server?

> `optional` **tool.server?**: `string`

---

### tool.success?

> `optional` **tool.success?**: `boolean`

---

### error.type?

> `optional` **error.type?**: `string`

---

### error.message?

> `optional` **error.message?**: `string`

---

### error.stack?

> `optional` **error.stack?**: `string`

---

### error?

> `optional` **error?**: `boolean`

---

### input?

> `optional` **input?**: `unknown`

---

### output?

> `optional` **output?**: `unknown`

---

### expected?

> `optional` **expected?**: `unknown`

---

### scores?

> `optional` **scores?**: `Record`\<`string`, `number`\>
