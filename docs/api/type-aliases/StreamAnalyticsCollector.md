[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsCollector

# Type Alias: StreamAnalyticsCollector

> **StreamAnalyticsCollector** = `object`

Stream analytics collector type

## Methods

### collectUsage()

> **collectUsage**(`result`): `Promise`\<[`TokenUsage`](TokenUsage.md)\>

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`TokenUsage`](TokenUsage.md)\>

---

### collectMetadata()

> **collectMetadata**(`result`): `Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

#### Parameters

##### result

[`StreamTextResult`](StreamTextResult.md)

#### Returns

`Promise`\<[`ResponseMetadata`](ResponseMetadata.md)\>

---

### createAnalytics()

> **createAnalytics**(`provider`, `model`, `result`, `startTime`, `context?`): `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

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
