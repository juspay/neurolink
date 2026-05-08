[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsAggregator

# Class: MetricsAggregator

Defined in: [observability/metricsAggregator.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L18)

Metrics Aggregator for comprehensive telemetry analysis
Provides latency percentiles, token aggregation, and cost tracking

## Constructors

### Constructor

> **new MetricsAggregator**(`config?`): `MetricsAggregator`

Defined in: [observability/metricsAggregator.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L34)

#### Parameters

##### config?

[`MetricsAggregatorConfig`](../type-aliases/MetricsAggregatorConfig.md) = `{}`

#### Returns

`MetricsAggregator`

## Methods

### recordSpan()

> **recordSpan**(`span`): `void`

Defined in: [observability/metricsAggregator.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L47)

Record a span for metrics aggregation

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`void`

---

### getLatencyStats()

> **getLatencyStats**(): [`LatencyStats`](../type-aliases/LatencyStats.md)

Defined in: [observability/metricsAggregator.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L274)

Get comprehensive latency statistics

#### Returns

[`LatencyStats`](../type-aliases/LatencyStats.md)

---

### getTokenStats()

> **getTokenStats**(): [`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

Defined in: [observability/metricsAggregator.ts:301](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L301)

Get token usage statistics

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### getCostByProvider()

> **getCostByProvider**(): [`ProviderCostStats`](../type-aliases/ProviderCostStats.md)[]

Defined in: [observability/metricsAggregator.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L308)

Get cost breakdown by provider

#### Returns

[`ProviderCostStats`](../type-aliases/ProviderCostStats.md)[]

---

### getCostByModel()

> **getCostByModel**(): [`ModelCostStats`](../type-aliases/ModelCostStats.md)[]

Defined in: [observability/metricsAggregator.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L315)

Get cost breakdown by model

#### Returns

[`ModelCostStats`](../type-aliases/ModelCostStats.md)[]

---

### getTotalCost()

> **getTotalCost**(): `number`

Defined in: [observability/metricsAggregator.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L322)

Get total cost across all providers

#### Returns

`number`

---

### getTimeWindows()

> **getTimeWindows**(): [`TimeWindowStats`](../type-aliases/TimeWindowStats.md)[]

Defined in: [observability/metricsAggregator.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L334)

Get time window statistics

#### Returns

[`TimeWindowStats`](../type-aliases/TimeWindowStats.md)[]

---

### getStatsForTimeRange()

> **getStatsForTimeRange**(`startTime`, `endTime`): [`TimeWindowStats`](../type-aliases/TimeWindowStats.md)

Defined in: [observability/metricsAggregator.ts:343](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L343)

Get statistics for a specific time range

#### Parameters

##### startTime

`Date`

##### endTime

`Date`

#### Returns

[`TimeWindowStats`](../type-aliases/TimeWindowStats.md)

---

### recordLatency()

> **recordLatency**(`operation`, `latencyMs`): `void`

Defined in: [observability/metricsAggregator.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L382)

Record a latency measurement for an operation
Use this for standalone latency tracking without a full span

#### Parameters

##### operation

`string`

##### latencyMs

`number`

#### Returns

`void`

---

### getMetrics()

> **getMetrics**(): [`MetricsSummary`](../type-aliases/MetricsSummary.md)

Defined in: [observability/metricsAggregator.ts:403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L403)

Get comprehensive metrics summary (alias for getSummary)

#### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

### getSummary()

> **getSummary**(): [`MetricsSummary`](../type-aliases/MetricsSummary.md)

Defined in: [observability/metricsAggregator.ts:410](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L410)

Get comprehensive metrics summary

#### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

### getSpans()

> **getSpans**(): [`SpanData`](../type-aliases/SpanData.md)[]

Defined in: [observability/metricsAggregator.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L436)

Get all recorded spans (returns a copy)

#### Returns

[`SpanData`](../type-aliases/SpanData.md)[]

---

### getTraces()

> **getTraces**(): [`TraceView`](../type-aliases/TraceView.md)[]

Defined in: [observability/metricsAggregator.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L443)

Get spans grouped by traceId as hierarchical trace views

#### Returns

[`TraceView`](../type-aliases/TraceView.md)[]

---

### getTokenTracker()

> **getTokenTracker**(): [`TokenTracker`](TokenTracker.md)

Defined in: [observability/metricsAggregator.ts:490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L490)

Get the underlying token tracker for custom pricing configuration

#### Returns

[`TokenTracker`](TokenTracker.md)

---

### reset()

> **reset**(): `void`

Defined in: [observability/metricsAggregator.ts:497](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L497)

Reset all metrics

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [observability/metricsAggregator.ts:514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L514)

Export metrics as JSON

#### Returns

`Record`\<`string`, `unknown`\>

---

### formatCost()

> **formatCost**(`cost`, `currency?`): `string`

Defined in: [observability/metricsAggregator.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L546)

Format cost as currency string

#### Parameters

##### cost

`number`

##### currency?

`string` = `"USD"`

#### Returns

`string`

---

### getFormattedSummary()

> **getFormattedSummary**(): `string`

Defined in: [observability/metricsAggregator.ts:557](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/metricsAggregator.ts#L557)

Get a formatted summary string

#### Returns

`string`
