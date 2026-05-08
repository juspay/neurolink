[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsData

# Type Alias: StreamAnalyticsData

> **StreamAnalyticsData** = `object`

Defined in: [types/analytics.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/analytics.ts#L47)

Stream Analytics Data - Enhanced for performance tracking

## Properties

### toolResults?

> `optional` **toolResults?**: `Promise`\<`unknown`[]\>

Defined in: [types/analytics.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/analytics.ts#L49)

Tool execution results with timing

---

### toolCalls?

> `optional` **toolCalls?**: `Promise`\<`unknown`[]\>

Defined in: [types/analytics.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/analytics.ts#L51)

Tool calls made during stream

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/analytics.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/analytics.ts#L53)

Stream performance metrics

#### startTime

> **startTime**: `number`

#### endTime?

> `optional` **endTime?**: `number`

#### chunkCount

> **chunkCount**: `number`

#### avgChunkSize

> **avgChunkSize**: `number`

#### totalBytes

> **totalBytes**: `number`

---

### providerAnalytics?

> `optional` **providerAnalytics?**: [`AnalyticsData`](AnalyticsData.md)

Defined in: [types/analytics.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/analytics.ts#L61)

Provider analytics
