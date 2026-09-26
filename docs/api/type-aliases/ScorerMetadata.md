[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerMetadata

# Type Alias: ScorerMetadata

> **ScorerMetadata** = `object`

Scorer metadata for registration

## Properties

### id

> **id**: `string`

Unique scorer identifier

---

### name

> **name**: `string`

Human-readable name

---

### description

> **description**: `string`

Description of what the scorer evaluates

---

### type

> **type**: [`ScorerType`](ScorerType.md)

Scorer type (llm, rule, hybrid)

---

### category

> **category**: [`ScorerCategory`](ScorerCategory.md)

Category for grouping

---

### version

> **version**: `string`

Version string

---

### defaultConfig

> **defaultConfig**: [`ScorerConfig`](ScorerConfig.md)

Default configuration

---

### requiredInputs

> **requiredInputs**: keyof [`ScorerInput`](ScorerInput.md)[]

Required input fields

---

### optionalInputs

> **optionalInputs**: keyof [`ScorerInput`](ScorerInput.md)[]

Optional input fields
