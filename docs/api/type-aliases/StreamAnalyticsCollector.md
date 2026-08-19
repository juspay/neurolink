[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsCollector

# Type Alias: StreamAnalyticsCollector

> **StreamAnalyticsCollector** = `object`

Defined in: [types/stream.ts:961](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L961)

Stream analytics collector type

## Methods

### collectUsage()

> **collectUsage**(`result`): `Promise`\<[`TokenUsage`](TokenUsage.md)\>

Defined in: [types/stream.ts:962](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L962)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`TokenUsage`](TokenUsage.md)\>

---

### collectMetadata()

> **collectMetadata**(`result`): `Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

Defined in: [types/stream.ts:963](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L963)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

---

### createAnalytics()

> **createAnalytics**(`provider`, `model`, `result`, `startTime`, `context?`): `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

Defined in: [types/stream.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L964)

#### Parameters

##### provider

`string`

##### model

`string`

##### result

[`StreamTextResult`](StreamTextResult.md)

##### startTime

`number`

##### context?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`AnalyticsData`](AnalyticsData.md)\>
