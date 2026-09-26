[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelConfig

# Type Alias: ModelConfig

> **ModelConfig** = `object`

Model configuration for a specific provider

## Properties

### id

> **id**: `string`

Model identifier

---

### name

> **name**: `string`

Display name

---

### tier

> **tier**: [`ModelTier`](ModelTier.md)

Performance tier

---

### cost

> **cost**: `object`

Cost per 1K tokens

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### capabilities

> **capabilities**: `string`[]

Model capabilities

---

### options?

> `optional` **options?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Model-specific options
