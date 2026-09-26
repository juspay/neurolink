[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsData

# Type Alias: StreamAnalyticsData

> **StreamAnalyticsData** = `object`

Stream Analytics Data - Enhanced for performance tracking

## Properties

### toolResults?

> `optional` **toolResults?**: `Promise`\<`unknown`[]\>

Tool execution results with timing

---

### toolCalls?

> `optional` **toolCalls?**: `Promise`\<`unknown`[]\>

Tool calls made during stream

---

### performance?

> `optional` **performance?**: `object`

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

Provider analytics
