[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsCollector

# Type Alias: StreamAnalyticsCollector

> **StreamAnalyticsCollector** = `object`

Defined in: [types/stream.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1122)

Stream analytics collector type

## Methods

### collectUsage()

> **collectUsage**(`result`): `Promise`\<[`TokenUsage`](TokenUsage.md)\>

Defined in: [types/stream.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1123)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`TokenUsage`](TokenUsage.md)\>

---

### collectMetadata()

> **collectMetadata**(`result`): `Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

Defined in: [types/stream.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1124)

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

---

### createAnalytics()

> **createAnalytics**(`provider`, `model`, `result`, `startTime`, `context?`): `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

Defined in: [types/stream.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1125)

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
