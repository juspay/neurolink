[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticReport

# Type Alias: DiagnosticReport

> **DiagnosticReport** = `object`

Defined in: [types/providers.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2434)

Aggregated SageMaker diagnostic report.

## Properties

### overallStatus

> **overallStatus**: `"healthy"` \| `"issues"` \| `"critical"`

Defined in: [types/providers.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2435)

---

### results

> **results**: [`DiagnosticResult`](DiagnosticResult.md)[]

Defined in: [types/providers.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2436)

---

### summary

> **summary**: `object`

Defined in: [types/providers.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2437)

#### total

> **total**: `number`

#### passed

> **passed**: `number`

#### failed

> **failed**: `number`

#### warnings

> **warnings**: `number`
