[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2342)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2343](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2343)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2344)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2345](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2345)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
