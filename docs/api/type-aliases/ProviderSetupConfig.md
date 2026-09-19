[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1496)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1497)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1498)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1499)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1500)
