[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LatencyStats

# Type Alias: LatencyStats

> **LatencyStats** = `object`

Defined in: [types/observability.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L311)

Latency statistics with percentile calculations

## Properties

### min

> **min**: `number`

Defined in: [types/observability.ts:313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L313)

Minimum latency in milliseconds

---

### max

> **max**: `number`

Defined in: [types/observability.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L315)

Maximum latency in milliseconds

---

### mean

> **mean**: `number`

Defined in: [types/observability.ts:317](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L317)

Mean/average latency in milliseconds

---

### median

> **median**: `number`

Defined in: [types/observability.ts:319](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L319)

Median latency (p50) in milliseconds

---

### p50

> **p50**: `number`

Defined in: [types/observability.ts:321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L321)

50th percentile latency in milliseconds

---

### p75

> **p75**: `number`

Defined in: [types/observability.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L323)

75th percentile latency in milliseconds

---

### p90

> **p90**: `number`

Defined in: [types/observability.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L325)

90th percentile latency in milliseconds

---

### p95

> **p95**: `number`

Defined in: [types/observability.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L327)

95th percentile latency in milliseconds

---

### p99

> **p99**: `number`

Defined in: [types/observability.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L329)

99th percentile latency in milliseconds

---

### stdDev

> **stdDev**: `number`

Defined in: [types/observability.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L331)

Standard deviation in milliseconds

---

### count

> **count**: `number`

Defined in: [types/observability.ts:333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L333)

Total number of samples
