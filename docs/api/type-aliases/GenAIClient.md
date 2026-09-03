[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIClient

# Type Alias: GenAIClient

> **GenAIClient** = `object`

Defined in: [types/providers.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1204)

Google AI client interface

## Properties

### live

> **live**: `object`

Defined in: [types/providers.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1205)

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

Defined in: [types/providers.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1206)
