[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2427)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2428)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2429)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2430)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
