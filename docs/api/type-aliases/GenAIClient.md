[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIClient

# Type Alias: GenAIClient

> **GenAIClient** = `object`

Defined in: [types/providers.ts:916](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L916)

Google AI client interface

## Properties

### live

> **live**: `object`

Defined in: [types/providers.ts:917](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L917)

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

Defined in: [types/providers.ts:918](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L918)
