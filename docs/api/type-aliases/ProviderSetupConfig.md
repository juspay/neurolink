[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1524)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1525)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1526](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1526)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1527](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1527)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1528](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1528)
