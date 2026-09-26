[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsAggregator

# Class: MetricsAggregator

Metrics Aggregator for comprehensive telemetry analysis
Provides latency percentiles, token aggregation, and cost tracking

## Constructors

### Constructor

> **new MetricsAggregator**(`config?`): `MetricsAggregator`

#### Parameters

##### config?

[`MetricsAggregatorConfig`](../type-aliases/MetricsAggregatorConfig.md) = `{}`

#### Returns

`MetricsAggregator`

## Methods

### recordSpan()

> **recordSpan**(`span`): `void`

Record a span for metrics aggregation

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`void`

---

### getLatencyStats()

> **getLatencyStats**(): [`LatencyStats`](../type-aliases/LatencyStats.md)

Get comprehensive latency statistics

#### Returns

[`LatencyStats`](../type-aliases/LatencyStats.md)

---

### getTokenStats()

> **getTokenStats**(): [`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

Get token usage statistics

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### getCostByProvider()

> **getCostByProvider**(): [`ProviderCostStats`](../type-aliases/ProviderCostStats.md)[]

Get cost breakdown by provider

#### Returns

[`ProviderCostStats`](../type-aliases/ProviderCostStats.md)[]

---

### getCostByModel()

> **getCostByModel**(): [`ModelCostStats`](../type-aliases/ModelCostStats.md)[]

Get cost breakdown by model

#### Returns

[`ModelCostStats`](../type-aliases/ModelCostStats.md)[]

---

### getTotalCost()

> **getTotalCost**(): `number`

Get total cost across all providers

#### Returns

`number`

---

### getTimeWindows()

> **getTimeWindows**(): [`TimeWindowStats`](../type-aliases/TimeWindowStats.md)[]

Get time window statistics

#### Returns

[`TimeWindowStats`](../type-aliases/TimeWindowStats.md)[]

---

### getStatsForTimeRange()

> **getStatsForTimeRange**(`startTime`, `endTime`): [`TimeWindowStats`](../type-aliases/TimeWindowStats.md)

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

Get comprehensive metrics summary (alias for getSummary)

#### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

### getSummary()

> **getSummary**(): [`MetricsSummary`](../type-aliases/MetricsSummary.md)

Get comprehensive metrics summary

#### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

### getSpans()

> **getSpans**(): [`SpanData`](../type-aliases/SpanData.md)[]

Get all recorded spans (returns a copy)

#### Returns

[`SpanData`](../type-aliases/SpanData.md)[]

---

### getTraces()

> **getTraces**(): [`TraceView`](../type-aliases/TraceView.md)[]

Get spans grouped by traceId as hierarchical trace views

#### Returns

[`TraceView`](../type-aliases/TraceView.md)[]

---

### getTokenTracker()

> **getTokenTracker**(): [`TokenTracker`](TokenTracker.md)

Get the underlying token tracker for custom pricing configuration

#### Returns

[`TokenTracker`](TokenTracker.md)

---

### reset()

> **reset**(): `void`

Reset all metrics

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Export metrics as JSON

#### Returns

`Record`\<`string`, `unknown`\>

---

### formatCost()

> **formatCost**(`cost`, `currency?`): `string`

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

Get a formatted summary string

#### Returns

`string`
