[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierCatalogConfig

# Type Alias: ClassifierCatalogConfig

> **ClassifierCatalogConfig** = `object`

Defined in: [types/classifierRouter.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L258)

How the model catalogue widens the declared pool.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/classifierRouter.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L259)

---

### maxModels?

> `optional` **maxModels?**: `number`

Defined in: [types/classifierRouter.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L271)

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

Defined in: [types/classifierRouter.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L273)

Restrict the catalogue to these provider names. Omit for all configured.

---

### minContextWindow?

> `optional` **minContextWindow?**: `number`

Defined in: [types/classifierRouter.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L275)

Drop models whose context window is below this. Default: 0 (keep all).

---

### includeDeprecated?

> `optional` **includeDeprecated?**: `boolean`

Defined in: [types/classifierRouter.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L277)

Include models flagged deprecated in the registry. Default: false.
