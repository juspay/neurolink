[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2314)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2315)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2316)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2317](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2317)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
