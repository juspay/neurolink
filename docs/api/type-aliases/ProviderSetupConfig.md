[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderSetupConfig

# Type Alias: ProviderSetupConfig

> **ProviderSetupConfig** = `object`

Defined in: [types/cli.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1493)

Superset provider-setup config. `endpoint` is Azure-only; other providers
leave it undefined. Pre-consolidation there were 4 near-duplicate types
(Anthropic/Azure/GoogleAI/OpenAI); they are now one.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/cli.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1494)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/cli.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1495)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/cli.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1496)

---

### isReconfiguring?

> `optional` **isReconfiguring?**: `boolean`

Defined in: [types/cli.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1497)
