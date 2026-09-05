[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIClient

# Type Alias: GenAIClient

> **GenAIClient** = `object`

Defined in: [types/providers.ts:1225](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1225)

Google AI client interface

## Properties

### live

> **live**: `object`

Defined in: [types/providers.ts:1226](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1226)

#### connect

> **connect**: (`config`) => `Promise`\<[`GenAILiveSession`](GenAILiveSession.md)\>

##### Parameters

###### config

[`LiveConnectConfig`](LiveConnectConfig.md)

##### Returns

`Promise`\<[`GenAILiveSession`](GenAILiveSession.md)\>

---

### models

> **models**: [`GenAIModelsAPI`](GenAIModelsAPI.md)

Defined in: [types/providers.ts:1227](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1227)
