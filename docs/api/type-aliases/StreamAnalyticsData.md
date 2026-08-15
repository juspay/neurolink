[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAnalyticsData

# Type Alias: StreamAnalyticsData

> **StreamAnalyticsData** = `object`

Defined in: [types/analytics.ts:67](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L67)

Stream Analytics Data - Enhanced for performance tracking

## Properties

### toolResults?

> `optional` **toolResults?**: `Promise`\<`unknown`[]\>

Defined in: [types/analytics.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L69)

Tool execution results with timing

---

### toolCalls?

> `optional` **toolCalls?**: `Promise`\<`unknown`[]\>

Defined in: [types/analytics.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L71)

Tool calls made during stream

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/analytics.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L73)

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

Defined in: [types/analytics.ts:81](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/analytics.ts#L81)

Provider analytics
