[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierCatalogConfig

# Type Alias: ClassifierCatalogConfig

> **ClassifierCatalogConfig** = `object`

How the model catalogue widens the declared pool.

## Properties

### enabled

> **enabled**: `boolean`

---

### maxModels?

> `optional` **maxModels?**: `number`

Cap on catalogue-derived members. The binding constraint is the decision
model's input ceiling — state plus the longest single question must stay
under ~33K tokens, and the model question's `criteria` map is that
question. At roughly 40 tokens per rendered model that ceiling is
hundreds of models away.

Default: 120. The registry currently holds 64 models, so the default
never truncates today — it is a guard against a future registry that
grows past what one question can carry, not a limit anyone is hitting.

---

### providers?

> `optional` **providers?**: `string`[]

Restrict the catalogue to these provider names. Omit for all configured.

---

### minContextWindow?

> `optional` **minContextWindow?**: `number`

Drop models whose context window is below this. Default: 0 (keep all).

---

### includeDeprecated?

> `optional` **includeDeprecated?**: `boolean`

Include models flagged deprecated in the registry. Default: false.
