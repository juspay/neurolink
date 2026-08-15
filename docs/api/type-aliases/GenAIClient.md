[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIClient

# Type Alias: GenAIClient

> **GenAIClient** = `object`

Defined in: [types/providers.ts:1192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L1192)

Google AI client interface

## Properties

### live

> **live**: `object`

Defined in: [types/providers.ts:1193](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L1193)

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

Defined in: [types/providers.ts:1194](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L1194)
