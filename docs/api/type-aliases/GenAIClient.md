[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIClient

# Type Alias: GenAIClient

> **GenAIClient** = `object`

Defined in: [types/providers.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1277)

Google AI client interface

## Properties

### live

> **live**: `object`

Defined in: [types/providers.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1278)

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

Defined in: [types/providers.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1279)
