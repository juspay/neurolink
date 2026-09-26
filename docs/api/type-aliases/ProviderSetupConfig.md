[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### endpoint?

> `optional` **endpoint?**: `string`

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`
