[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRuleErrors

# Type Alias: ProviderRuleErrors

> **ProviderRuleErrors** = `object`

How a rules file classifies errors.

## Properties

### statusFrom?

> `optional` **statusFrom?**: `"cause-chain"` \| `"top-level"`

Where the HTTP status is read: anywhere in the cause chain (default) or the top-level error only.

---

### messageFrom?

> `optional` **messageFrom?**: `"composed"` \| `"top-level"`

Message tested by patterns: top-level plus deepest cause (default), or the top-level message only.

---

### timeout?

> `optional` **timeout?**: `object`

Replaces the shared handling of `TimeoutError`; `{message}` is the timeout's own message.

#### class

> **class**: [`CatalogErrorRuleClass`](CatalogErrorRuleClass.md)

#### message

> **message**: `string`

---

### useDefaults?

> `optional` **useDefaults?**: `boolean`

Append the shared default rules after these (default true).

---

### rules

> **rules**: [`ProviderRuleErrorJson`](ProviderRuleErrorJson.md)[]
