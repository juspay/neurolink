[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsCollector

# Type Alias: StreamAnalyticsCollector

> **StreamAnalyticsCollector** = `object`

Defined in: [types/stream.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1145)

Stream analytics collector type

## Methods

### collectUsage()

> **collectUsage**(`result`): `Promise`\<[`TokenUsage`](TokenUsage.md)\>

Defined in: [types/stream.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1146)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`TokenUsage`](TokenUsage.md)\>

---

### collectMetadata()

> **collectMetadata**(`result`): `Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

Defined in: [types/stream.ts:1147](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1147)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

---

### createAnalytics()

> **createAnalytics**(`provider`, `model`, `result`, `startTime`, `context?`): `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

Defined in: [types/stream.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1148)

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
